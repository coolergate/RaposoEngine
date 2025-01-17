import { t } from "@rbxts/t";

const HttpService = game.GetService("HttpService");

declare global {
	interface Entities {
		BaseEntity: typeof BaseEntity;
	}
}

abstract class BaseEntity 
{
	// readonly id: string = RandomString(10);
	readonly id: string = HttpService.GenerateGUID(false);
	classname: keyof Entities = "BaseEntity";

	protected setIsA = new Set<keyof Entities>();
	readonly rgDeletion = new Array<Callback>();
	readonly rgAssociatedInstances = new Array<Instance>();
	readonly mapAttributes = new Map<string, unknown>();

	constructor() 
	{
		this.setIsA.add("BaseEntity");
	}

	IsA<C extends keyof Entities>(classname: C): this is EntityType<C> 
	{
		return this.setIsA.has(classname) || this.classname === classname;
	}

	Think()
	{ }

	OnDelete(callback: (entity: this) => void) 
	{
		this.rgDeletion.push(callback);
	}

	AssociateInstance(inst: Instance) 
	{
		this.rgAssociatedInstances.push(inst);
	}

	SetAttribute(name: string, value: unknown) 
	{
		if (value === undefined) 
		{
			this.mapAttributes.delete(name);
			return;
		}

		this.mapAttributes.set(name, value);
	}
}

export = BaseEntity;
