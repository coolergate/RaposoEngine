import { t } from "@rbxts/t";
import { BufferReader, BufferWriter } from "./util/buffermngr";
import UTIL_ReplicatedInst from "./util/replicatedinst";

/* -------------------------------------------------------------------------- */
/*                            Interfaces and types                            */
/* -------------------------------------------------------------------------- */
declare global {
	type FuncTypeCheck<T> = (value: unknown) => value is T;
	type ListTypeCheck<List extends unknown[]> = { [K in keyof List]: FuncTypeCheck<List[K]> };
}

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
const Players = game.GetService("Players");
const workspace = game.GetService("Workspace");
const RunService = game.GetService("RunService");
const HttpService = game.GetService("HttpService");

const setSubscribedPlayers = new Set<number>();

const instRemoteFunction = UTIL_ReplicatedInst(workspace, "EngineRemoteFunction", "RemoteFunction");
const instEngineRemoteEvent = UTIL_ReplicatedInst(workspace, "EngineRemoteEvent", "RemoteEvent");

/* ------------------------------ NetworkEvents ----------------------------- */
const instNetworkEventRemote = UTIL_ReplicatedInst(workspace, "NetworkEvent", "RemoteEvent");
const instNetworkEventUnreliableRemote = UTIL_ReplicatedInst(
	workspace,
	"NetworkEventUnreliable",
	"UnreliableRemoteEvent",
);

/* ----------------------------- NetworkFunction ---------------------------- */
const instNetworkFunctionRemote = UTIL_ReplicatedInst(workspace, "NetworkFunction", "RemoteFunction");

/* ----------------------------- NetworkMessages ---------------------------- */
const instNetworkMessageRemote = UTIL_ReplicatedInst(workspace, "NetworkMessage", "RemoteEvent");
const instNetworkMessageUnreliableRemote = UTIL_ReplicatedInst(
	workspace,
	"NetworkMessageUnreliable",
	"UnreliableRemoteEvent",
);

const setRegisteredNetworkMessages = new Set<string>();
const mapNetworkMessagesCallback = new Map<string, (content: ReturnType<typeof BufferReader>) => void>();

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function fnSubPlr(inst: Player) 
{
	setSubscribedPlayers.add(inst.UserId);
}

function fnUnsubPlr(inst: Player) 
{
	setSubscribedPlayers.delete(inst.UserId);
}

function fnInitNetwork() 
{
	if (RunService.IsServer()) 
	{
		instNetworkEventRemote.OnServerEvent.Connect((user, ...args) => 
		{
			user.Kick(`Unauthorized request.`);

			const tostr = HttpService.JSONEncode(args);

			throw `UserId: ${user.UserId} attempted to call a RemoteEvent with the following args: ${tostr}`;
		});

		instNetworkFunctionRemote.OnServerInvoke = (user: Player, id, ...args) => 
		{
			if (!setSubscribedPlayers.has(user.UserId) || !t.string(id)) return;

			const callback = NetworkFunction.mapNetFunctionsCallbacks.get(id);
			if (!callback) 
			{
				throw `Attempt to call unknown callback "${id}" from user ${user.UserId}`;
			}

			return callback(user, ...args);
		};

		// TODO: Replace this with an appropriate login function
		instRemoteFunction.OnServerInvoke = (user) => 
		{
			fnSubPlr(user);
		};

		Players.PlayerRemoving.Connect((user) => fnUnsubPlr(user));
	}

	// Client
	if (RunService.IsClient()) 
	{
		// NetworkEvent
		instNetworkEventRemote.OnClientEvent.Connect((id, ...content) => 
		{
			if (!t.string(id)) throw `Invalid NetworkEvent id: ${tostring(id)}`;

			const callback = NetworkEvent.map_NetEventsCallbacks.get(id);
			if (!callback)
				throw `NetworkEvent "${id}" does not have a callback bound on the client or it doesn't exist.`;

			callback(...(content as unknown[]));
		});

		// NetworkMessage
		instNetworkMessageRemote.OnClientEvent.Connect((id, buffer: buffer) => 
		{
			if (!t.string(id)) throw `Invalid recieved NetworkMessage id: ${tostring(id)}`;

			const callback = mapNetworkMessagesCallback.get(id);
			if (!callback)
				throw `NetworkMessage "${id}" does not have a callback bound on the client or it doesn't exist.`;

			callback(BufferReader(buffer));
		});
	}
}

function fnNetMsg(name: string) 
{
	setRegisteredNetworkMessages.add(name);

	return {
		MESSAGE_BEGIN(bIsReliable: boolean, rgPlayers = Players.GetPlayers(), rgIgnore: Player[] = []) 
		{
			for (let index = 0; index < rgPlayers.size(); index++) 
			{
				const element = rgPlayers[index];
				if (!rgIgnore.includes(element)) continue;
				rgPlayers.remove(index);
			}

			const bfr = buffer.create(5000);

			const stFuncs = BufferWriter(bfr)
				
			const fnMessageEnd = () => 
			{
				if (RunService.IsClient()) 
				{
					warn("NetworkMessage send function called from the client, ignoring...");
					print(debug.traceback("NetworkMessage traceback:", 1));
					return;
				}

				for (const user of rgPlayers) 
				{
					if (!setSubscribedPlayers.has(user.UserId)) continue;

					if (bIsReliable) instNetworkMessageRemote.FireClient(user as Player, name, bfr);
					else instNetworkMessageUnreliableRemote.FireClient(user as Player, name, bfr);
				}
			};

			rawset(stFuncs, "MESSAGE_END", fnMessageEnd);

			return stFuncs as typeof stFuncs & { MESSAGE_END(): void };
		},

		SetClientRecieve(callback: (content: ReturnType<typeof BufferReader>) => void) 
		{
			mapNetworkMessagesCallback.set(name, callback);
		},
	};
}

/* -------------------------------------------------------------------------- */
/*                                NetworkEvent                                */
/* -------------------------------------------------------------------------- */
class NetworkEvent<A extends unknown[]> 
{
	static map_NetEvents = new Map<string, NetworkEvent<unknown[]>>();
	static map_NetEventsCallbacks = new Map<string, Callback>();

	constructor(private identifier: string) 
	{
		NetworkEvent.map_NetEvents.set(identifier, this as unknown as NetworkEvent<unknown[]>);
	}

	CreateEvent(bIsReliable: boolean, rgPlayers = Players.GetPlayers(), rgIgnore: Player[] = []) 
	{
		for (let index = 0; index < rgPlayers.size(); index++) 
		{
			const element = rgPlayers[index];
			if (!rgIgnore.includes(element)) continue;
			rgPlayers.remove(index);
		}

		return (...list_Data: A) => 
		{
			if (RunService.IsClient()) 
			{
				warn("NetworkEvent send function called from the client, ignoring...");
				print(debug.traceback("NetworkEvent traceback:", 1));
				return;
			}

			for (const user of rgPlayers) 
			{
				if (!setSubscribedPlayers.has(user.UserId)) continue;

				if (bIsReliable) instNetworkEventRemote.FireClient(user as Player, this.identifier, ...list_Data);
				else instNetworkEventUnreliableRemote.FireClient(user as Player, this.identifier, ...list_Data);
			}
		};
	}

	OnClientRecieve(callback: (...args: A) => void) 
	{
		NetworkEvent.map_NetEventsCallbacks.set(this.identifier, callback);
	}
}

class NetworkFunction<A extends unknown[], R> 
{
	static mapNetFunctions = new Map<string, NetworkFunction<unknown[], unknown>>();
	static mapNetFunctionsCallbacks = new Map<string, Callback>();

	constructor(private identifier: string) 
	{
		NetworkFunction.mapNetFunctions.set(identifier, this as NetworkFunction<unknown[], unknown>);
	}

	RequestServer(...args: A) 
	{
		if (RunService.IsServer()) throw `Function cannot be called from the server.`;

		return new Promise<R>((resolve, reject) => 
		{
			const value = instNetworkFunctionRemote.InvokeServer(this.identifier, ...args);
			resolve(value as R);
		});
	}

	OnServerRecieve(callback: (user: Player, ...args: A) => R) 
	{
		NetworkFunction.mapNetFunctionsCallbacks.set(this.identifier, callback);
	}
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */
export = {
	EngineRemoteEvent: instEngineRemoteEvent,
	EngineRemoteFunction: instRemoteFunction,

	SubscribePlayer: fnSubPlr,
	UnsubscribePlayer: fnUnsubPlr,

	InitializeNetworking: fnInitNetwork,
	NetworkMessage: fnNetMsg,
	NetworkEvent: NetworkEvent,
	NetworkFunction: NetworkFunction,
};
