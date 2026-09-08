--[[
	Gives every player a basic melee weapon so they can actually fight the
	creatures LIVE events (or ArenaDirector's ambient spawner) put in the
	world. Built entirely at runtime — no pre-made Tool asset needed.

	Uses a server-only trick that needs no LocalScript at all: Tool.Activated
	already fires on the SERVER whenever the owning client clicks/taps with
	the tool equipped (this is native Roblox replication, not something we
	wire up ourselves), so hit detection can live entirely in this one
	server-side module.
]]

local Players = game:GetService("Players")

local WeaponService = {}

local DAMAGE = 20
local RANGE = 6
local SWING_COOLDOWN = 0.6

local function buildSword(): Tool
	local tool = Instance.new("Tool")
	tool.Name = "Sword"
	tool.RequiresHandle = true
	tool.CanBeDropped = false
	tool.ToolTip = "Click to attack"

	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.4, 4, 0.4)
	handle.Color = Color3.fromRGB(200, 200, 210)
	handle.Material = Enum.Material.Metal
	handle.CanCollide = false
	handle.Parent = tool

	local lastSwingAt = 0

	tool.Activated:Connect(function()
		local now = os.clock()
		if now - lastSwingAt < SWING_COOLDOWN then
			return
		end
		lastSwingAt = now

		local character = tool.Parent
		if not character or not character:IsA("Model") then
			return
		end
		local wielder = Players:GetPlayerFromCharacter(character)
		local wielderRoot = character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if not wielder or not wielderRoot then
			return
		end

		for _, model in ipairs(workspace:GetChildren()) do
			if model:IsA("Model") and model ~= character then
				local targetHumanoid = model:FindFirstChildOfClass("Humanoid")
				local targetRoot = model:FindFirstChild("HumanoidRootPart") :: BasePart?
				if targetHumanoid and targetRoot and targetHumanoid.Health > 0 then
					local dist = (targetRoot.Position - wielderRoot.Position).Magnitude
					if dist <= RANGE then
						model:SetAttribute("LastHitBy", wielder.UserId)
						targetHumanoid:TakeDamage(DAMAGE)
					end
				end
			end
		end
	end)

	return tool
end

--- Equips (or re-equips) the sword in a player's backpack. Safe to call repeatedly.
function WeaponService.giveTo(player: Player)
	if player.Backpack:FindFirstChild("Sword") then
		return
	end
	if player.Character and player.Character:FindFirstChild("Sword") then
		return
	end
	buildSword().Parent = player.Backpack
end

return WeaponService
