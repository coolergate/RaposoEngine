/* -------------------------------------------------------------------------- */
/*                            Interfaces and types                            */
/* -------------------------------------------------------------------------- */
declare interface GameControllerStructure {
	OnInit(): void;
	OnStart(): void;

	Update(dt: number): void;
	FixedUpdate(dt: number): void;
	LateUpdate(dt: number): void;

	OnDisconnect(): void;
}

declare global {
	type GameControllerObject<T> = T & Partial<GameControllerStructure>;

	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface Controllers {}
}

declare const module: {
	List: { [T in keyof Controllers]: Controllers[T] };

	RegisterSharedController: <T, N extends keyof Controllers>(controller: GameControllerObject<T>, name: N) => void;
	StartControllers: () => void;
	InitializeControllers: () => void;
};

export = module;
