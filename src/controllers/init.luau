local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- -------------------------------------------------------------------------- --
--                                    Types                                   --
-- -------------------------------------------------------------------------- --
type GameControllerStructure = {
	OnInit: () -> nil,
	OnStart: () -> nil,

	Update: (dt: number) -> nil,
	FixedUpdate: (dt: number) -> nil,
	LateUpdate: (dt: number) -> nil,

	OnDisconnect: () -> nil,
}

-- -------------------------------------------------------------------------- --
--                                  Variables                                 --
-- -------------------------------------------------------------------------- --
local searchfolder = ReplicatedStorage:WaitForChild("shared"):WaitForChild("controllers") :: Folder
local rgControllersMapping = {} :: { ["string"]: GameControllerStructure }

local module = {}
module.List = rgControllersMapping

-- -------------------------------------------------------------------------- --
--                                  Functions                                 --
-- -------------------------------------------------------------------------- --
function module.RegisterSharedController(controller: GameControllerStructure, name: string)
	rgControllersMapping[name] = controller
end

function module.StartControllers()
	for _, controller in rgControllersMapping do
		if controller.OnStart ~= nil then
			controller:OnStart()
		end
	end
end

function module.InitializeControllers()
	local rgControllersChildren = searchfolder:GetChildren() :: { Instance }

	for _, inst in rgControllersChildren do
		if not inst:IsA("ModuleScript") then
			continue
		end

		require(inst)
	end

	for _, controller in rgControllersMapping do
		if controller.OnInit ~= nil then
			controller:OnInit()
		end
	end

	module.StartControllers()
end

return module
