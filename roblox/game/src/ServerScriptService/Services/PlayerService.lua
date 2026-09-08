--[[
	Small helper wrapper around the Players service for the command handlers
	that target players (heal, damage, teleport, freeze/unfreeze).
]]

local Players = game:GetService("Players")

local PlayerService = {}

function PlayerService.getAllCharacters(): { Model }
	local characters = {}
	for _, player in ipairs(Players:GetPlayers()) do
		if player.Character and player.Character:FindFirstChild("Humanoid") then
			table.insert(characters, player.Character)
		end
	end
	return characters
end

function PlayerService.healAll(amount: number)
	for _, character in ipairs(PlayerService.getAllCharacters()) do
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = math.min(humanoid.MaxHealth, humanoid.Health + amount)
		end
	end
end

function PlayerService.damageAll(amount: number)
	for _, character in ipairs(PlayerService.getAllCharacters()) do
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid:TakeDamage(amount)
		end
	end
end

function PlayerService.teleportAll(destination: Vector3)
	for _, character in ipairs(PlayerService.getAllCharacters()) do
		local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			root.CFrame = CFrame.new(destination)
		end
	end
end

function PlayerService.setAllFrozen(frozen: boolean)
	for _, character in ipairs(PlayerService.getAllCharacters()) do
		local humanoid = character:FindFirstChildOfClass("Humanoid") :: Humanoid?
		if humanoid then
			humanoid.WalkSpeed = frozen and 0 or 16
			humanoid.JumpPower = frozen and 0 or 50
		end
	end
end

function PlayerService.setAllSpeed(multiplier: number)
	for _, character in ipairs(PlayerService.getAllCharacters()) do
		local humanoid = character:FindFirstChildOfClass("Humanoid") :: Humanoid?
		if humanoid then
			humanoid.WalkSpeed = 16 * multiplier
		end
	end
end

return PlayerService
