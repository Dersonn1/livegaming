--[[
	Drives every creature spawned by CreatureFactory: finds the nearest
	living player, walks toward them once in aggro range, and deals damage
	on a per-creature cooldown once in attack range. One shared loop for
	every creature (not one thread each) keeps this cheap at MVP scale.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local AIService = {}

local ATTACK_RANGE = 5
local AGGRO_RANGE = 70
local ATTACK_COOLDOWN = 1.5
local TICK_INTERVAL = 0.2

local lastAttackAt: { [Model]: number } = {}

local function nearestLivingPlayerRoot(fromPosition: Vector3): (BasePart?, number)
	local nearestRoot, nearestDist = nil, math.huge
	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if humanoid and root and humanoid.Health > 0 then
			local dist = (root.Position - fromPosition).Magnitude
			if dist < nearestDist then
				nearestRoot, nearestDist = root, dist
			end
		end
	end
	return nearestRoot, nearestDist
end

function AIService.start()
	local accumulated = 0
	RunService.Heartbeat:Connect(function(dt)
		accumulated += dt
		if accumulated < TICK_INTERVAL then
			return
		end
		accumulated = 0

		for _, model in ipairs(workspace:GetChildren()) do
			if model:IsA("Model") and model:GetAttribute("IsCreature") then
				local humanoid = model:FindFirstChildOfClass("Humanoid")
				local root = model:FindFirstChild("HumanoidRootPart") :: BasePart?
				if humanoid and root and humanoid.Health > 0 then
					local targetRoot, dist = nearestLivingPlayerRoot(root.Position)
					if targetRoot and dist <= AGGRO_RANGE then
						humanoid:MoveTo(targetRoot.Position)

						if dist <= ATTACK_RANGE then
							local now = os.clock()
							if (lastAttackAt[model] or 0) + ATTACK_COOLDOWN <= now then
								lastAttackAt[model] = now
								local targetHumanoid = targetRoot.Parent
									and targetRoot.Parent:FindFirstChildOfClass("Humanoid")
								if targetHumanoid then
									targetHumanoid:TakeDamage(model:GetAttribute("Damage") or 10)
								end
							end
						end
					end
				else
					lastAttackAt[model] = nil
				end
			end
		end
	end)
end

return AIService
