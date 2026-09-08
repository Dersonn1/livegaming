--[[
	Builds real, functional creatures out of plain Parts — a small blocky
	humanoid (root + torso + head), a Humanoid for health/state, and a
	Died hook that awards the player who landed the finishing hit (see
	WeaponService, which stamps "LastHitBy" on any Humanoid it damages).

	No external assets/meshes are required, which keeps the whole pipeline
	testable with zero art content. Drop a real Model under
	ServerStorage/NPCs (see its README) and SpawnService will clone that
	instead of calling this factory, once you have real content.
]]

local Players = game:GetService("Players")
local Debris = game:GetService("Debris")

local CreatureFactory = {}

export type CreatureStats = {
	name: string,
	health: number,
	walkSpeed: number,
	damage: number,
	color: Color3,
	scale: number,
	points: number,
}

function CreatureFactory.spawn(stats: CreatureStats, position: Vector3): Model
	local model = Instance.new("Model")
	model.Name = stats.name

	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(2, 2, 1) * stats.scale
	root.Transparency = 1
	root.CanCollide = true
	root.CFrame = CFrame.new(position)
	root.Parent = model

	local torso = Instance.new("Part")
	torso.Name = "Torso"
	torso.Size = Vector3.new(2, 2, 1) * stats.scale
	torso.Color = stats.color
	torso.Material = Enum.Material.SmoothPlastic
	torso.CanCollide = false
	torso.CFrame = root.CFrame
	torso.Parent = model
	local torsoWeld = Instance.new("WeldConstraint")
	torsoWeld.Part0 = root
	torsoWeld.Part1 = torso
	torsoWeld.Parent = root

	local head = Instance.new("Part")
	head.Name = "Head"
	head.Shape = Enum.PartType.Ball
	head.Size = Vector3.new(1.2, 1.2, 1.2) * stats.scale
	head.Color = stats.color
	head.Material = Enum.Material.SmoothPlastic
	head.CanCollide = false
	head.CFrame = root.CFrame * CFrame.new(0, 1.6 * stats.scale, 0)
	head.Parent = model
	local headWeld = Instance.new("WeldConstraint")
	headWeld.Part0 = root
	headWeld.Part1 = head
	headWeld.Parent = root

	local humanoid = Instance.new("Humanoid")
	humanoid.MaxHealth = stats.health
	humanoid.Health = stats.health
	humanoid.WalkSpeed = stats.walkSpeed
	humanoid.Parent = model

	model.PrimaryPart = root
	model:SetAttribute("Damage", stats.damage)
	model:SetAttribute("Points", stats.points)
	model:SetAttribute("IsCreature", true)
	model.Parent = workspace

	humanoid.Died:Connect(function()
		local killerId = model:GetAttribute("LastHitBy")
		local player = killerId and Players:GetPlayerByUserId(killerId)
		local leaderstats = player and player:FindFirstChild("leaderstats")
		if leaderstats then
			leaderstats.Kills.Value += 1
			leaderstats.Points.Value += stats.points
		end
		Debris:AddItem(model, 3) -- brief pause so the death is visible before cleanup
	end)

	Debris:AddItem(model, 180) -- safety-net cleanup for creatures nobody ever kills
	return model
end

return CreatureFactory
