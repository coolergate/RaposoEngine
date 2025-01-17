import { List } from "./controllers";
import entity from "./entities";
import UTIL_UTC_Time from "./util/utctime";

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
const RunService = game.GetService("RunService");

const nTickrate = 1 / 20;

const rgTickCallback = new Array<(dt: number) => void>();
const rgFrameCallback = new Array<(dt: number) => void>();

let nNextUpdateTime = 0;
let nLastUpdateTime = 0;

let bGameRunning = false;

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function fnBindTick(callback: (dt: number) => void) 
{
	rgTickCallback.push(callback);
}
function fnBindFrame(callback: (dt: number) => void) 
{
	rgFrameCallback.push(callback);
}

async function fnInitLoop() 
{
	// get the next exact second and start the timer
	const nCurrentTime = UTIL_UTC_Time();
	nNextUpdateTime = nCurrentTime + math.round(nCurrentTime + 2) - nCurrentTime;
	nLastUpdateTime = nCurrentTime;

	if (RunService.IsServer()) RunService.Heartbeat.Connect((dt) => Update(dt));
	else RunService.BindToRenderStep("updatecycle", -99, (dt) => Update(dt));

	bGameRunning = true;

	// let frameStart = os.clock();
	// while (bGameRunning) {
	// 	while (
	// 		GraphicalSettings.FramerateCapEnabled &&
	// 		os.clock() - frameStart < 1 / GraphicalSettings.FramerateCapAmount
	// 	) {
	// 		// Do absolutely nothing...
	// 	}

	// 	const nDeltaRenderTime = RunService.PreRender.Wait()[0];
	// 	Update(nDeltaRenderTime);

	// 	frameStart = os.clock();
	// }
}

function Update(dt: number) 
{
	const currenttime = UTIL_UTC_Time();

	// Update controllers
	const mapControllers = List as unknown as Map<string, GameControllerObject<object>>;

	for (const [name, con] of mapControllers) if ("Update" in con) con.Update!(dt);

	if (currenttime >= nNextUpdateTime) 
	{
		for (const callback of rgTickCallback) callback(currenttime - nLastUpdateTime);

		// Update controllers (again)
		for (const [name, con] of mapControllers)
			if ("FixedUpdate" in con) con.FixedUpdate!(currenttime - nLastUpdateTime);

		// Update entities
		for (const ent of entity.GetEntitiesThatIsA("BaseEntity")) 
		{
			if (!entity.IsEntityOnMemoryOrImSchizo(ent)) continue; // Better make sure due to my stupidity.
			ent.Think();
		}

		nNextUpdateTime = nLastUpdateTime + nTickrate;
		nLastUpdateTime = currenttime;
	}

	// Update frame bindings
	for (const bind of rgFrameCallback) bind(dt);

	// Update controllers (yet again)
	for (const [name, con] of mapControllers) if ("LateUpdate" in con) con.LateUpdate!(dt);
}

/* -------------------------------------------------------------------------- */
/*                                 Connections                                */
/* -------------------------------------------------------------------------- */
if (RunService.IsServer())
	game.BindToClose((reason) => 
	{
		bGameRunning = false;
	});

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */
export = {
	Tickrate: nTickrate,
	BindFrameStep: fnBindFrame,
	BindTickStep: fnBindTick,
	InitLifecycle: fnInitLoop,
};
