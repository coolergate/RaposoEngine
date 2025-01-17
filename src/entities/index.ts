import { t } from "@rbxts/t";
import BaseEntity from "./BaseEntity";

/* -------------------------------------------------------------------------- */
/*                            Interfaces and types                            */
/* -------------------------------------------------------------------------- */
declare global {
	type EntityType<T extends keyof Entities> = Entities[T]["prototype"];
	type t_EntityReplication = {
		entclassname: keyof Entities;
		entid: string;
		construct_args: unknown[];
		content: Map<string, unknown>;
	};
}

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
const mapEntityConstructor = new Map<string, new (...args: never[]) => BaseEntity>();
const mapGameEntities = new Map<string, { construct_args: unknown[]; ent: BaseEntity }>();

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function fnCreateEntName<
	K extends keyof Entities,
	E extends Entities[K],
	C extends E extends new (...args: infer A) => BaseEntity ? A : never[],
>(name: K, customid?: string, ...args: C): EntityType<K> 
{
	const entity_constructor = mapEntityConstructor.get(name);
	if (!entity_constructor) throw `Unknown entity classname "${name}"`;

	const entity = new entity_constructor(...(args as never[]));
	if (customid !== undefined) rawset(entity, "id", customid);

	print("Creating entity", name);

	mapGameEntities.set(entity.id, {
		construct_args: args,
		ent: entity,
	});

	return entity;
}

function fnDestroyEnt(entity: BaseEntity) 
{
	if (!fnEntityOnMemory(entity)) return;
	if (!t.table(entity) || !t.string(rawget(entity, "id")))
		throw `This s### is an invalid entity. ${entity.classname} ${entity.id}`;

	print("Deleting entity:", entity.classname, entity.id);

	mapGameEntities.delete(entity.id);

	task.defer(() => 
	{
		for (const callback of entity.rgDeletion) callback(entity);
		table.clear(entity);
	});
}

function fnEntityOnMemory(entity: BaseEntity | string | undefined): boolean 
{
	if (!t.any(entity)) 
	{
		return false;
	}

	if (t.string(entity)) 
	{
		return mapGameEntities.has(entity);
	}
	if (!t.table(entity)) return false;

	const id = rawget(entity, "id");
	if (!t.string(id)) return false;

	for (const [id, info] of mapGameEntities) 
	{
		if (entity.id !== id) continue;

		return info.ent === entity;
	}

	return false;
}

function fnGetEntId(entid: string) 
{
	for (const [entityid, build] of mapGameEntities) 
	{
		if (build.ent.id === entid) return build.ent;
	}
}

function fnGetEntThatIsA<K extends keyof Entities, E extends Entities[K]>(classname: K): E["prototype"][] 
{
	const entities = new Array<E["prototype"]>();

	for (const [, info] of mapGameEntities) 
	{
		if (!info.ent.IsA(classname)) continue;

		entities.push(info.ent as EntityType<K>);
	}

	return entities;
}

function fnGetEntFromInst(inst: Instance) 
{
	const rgEntities = new Array<BaseEntity>();

	for (const [, info] of mapGameEntities) 
	{
		if (!info.ent.rgAssociatedInstances.includes(inst)) 
		{
			// Is it a descendant of one associated instance?
			for (const inst2 of info.ent.rgAssociatedInstances) 
			{
				if (!inst.IsDescendantOf(inst2)) continue;
				rgEntities.push(info.ent);
				break;
			}

			continue;
		}

		rgEntities.push(info.ent);
	}

	return rgEntities;
}

function fnInitEntsConstructor(folder: Instance) 
{
	mapEntityConstructor.clear();

	for (const inst of folder.GetChildren()) 
	{
		if (!inst.IsA("ModuleScript")) continue;

		require(inst);
	}
}

function fnLinkEntityToClass(builder: new (...args: never[]) => BaseEntity, classname: keyof Entities) 
{
	print(`Linked entity ${classname}`);
	mapEntityConstructor.set(classname, builder);
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */
export = {
	CreateEntityByName: fnCreateEntName,
	KillThisMafaker: fnDestroyEnt,
	GetEntityFromId: fnGetEntId,
	GetEntitiesThatIsA: fnGetEntThatIsA,
	GetEntitiesFromInstance: fnGetEntFromInst,
	InitializeEntitiesConstructor: fnInitEntsConstructor,
	IsEntityOnMemoryOrImSchizo: fnEntityOnMemory,
	LinkEntityToClass: fnLinkEntityToClass,

	EntitiesMap: mapGameEntities,
};
