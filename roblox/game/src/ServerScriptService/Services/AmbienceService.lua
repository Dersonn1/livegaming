--[[
	One-time visual mood setup: sky/lighting/atmosphere. Pure Lighting-service
	property tweaks and a built-in Atmosphere instance — no custom skybox
	images or assets needed, just Roblox's native atmospheric fog system.
]]

local Lighting = game:GetService("Lighting")

local AmbienceService = {}

function AmbienceService.apply()
	Lighting.ClockTime = 17.5 -- warm late-afternoon light reads better than flat noon
	Lighting.Brightness = 2.5
	Lighting.Ambient = Color3.fromRGB(70, 70, 90)
	Lighting.OutdoorAmbient = Color3.fromRGB(110, 110, 130)
	Lighting.ColorShift_Top = Color3.fromRGB(255, 200, 150)
	Lighting.ColorShift_Bottom = Color3.fromRGB(40, 40, 60)
	Lighting.EnvironmentDiffuseScale = 1
	Lighting.EnvironmentSpecularScale = 1

	if not Lighting:FindFirstChildOfClass("Atmosphere") then
		local atmosphere = Instance.new("Atmosphere")
		atmosphere.Density = 0.3
		atmosphere.Offset = 0.25
		atmosphere.Color = Color3.fromRGB(199, 170, 149)
		atmosphere.Decay = Color3.fromRGB(92, 60, 40)
		atmosphere.Glare = 0.2
		atmosphere.Haze = 1.2
		atmosphere.Parent = Lighting
	end

	if not Lighting:FindFirstChildOfClass("BloomEffect") then
		local bloom = Instance.new("BloomEffect")
		bloom.Intensity = 0.4
		bloom.Size = 24
		bloom.Threshold = 1.5
		bloom.Parent = Lighting
	end

	if not Lighting:FindFirstChildOfClass("ColorCorrectionEffect") then
		local colorCorrection = Instance.new("ColorCorrectionEffect")
		colorCorrection.Saturation = 0.1
		colorCorrection.Contrast = 0.05
		colorCorrection.Parent = Lighting
	end
end

return AmbienceService
