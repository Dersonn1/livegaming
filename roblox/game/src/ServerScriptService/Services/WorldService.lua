--[[
	Global world-state changes: gravity, time-of-day, and a simple weather
	flag other scripts/VFX systems can read from an Attribute on Workspace.
	Roblox has no built-in "weather" system, so CHANGE_WEATHER just sets an
	attribute + fires the LiveEventNotification remote for client VFX to
	react to — wire your own rain/snow particle systems to listen for it.
]]

local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local WorldService = {}

local gravityResetTask: thread? = nil
local speedResetTask: thread? = nil

function WorldService.changeGravity(value: number, durationSeconds: number)
	local original = Workspace.Gravity
	Workspace.Gravity = value

	if gravityResetTask then
		task.cancel(gravityResetTask)
	end
	gravityResetTask = task.delay(durationSeconds, function()
		Workspace.Gravity = original
	end)
end

function WorldService.changeSpeed(multiplier: number, durationSeconds: number, playerService)
	playerService.setAllSpeed(multiplier)

	if speedResetTask then
		task.cancel(speedResetTask)
	end
	speedResetTask = task.delay(durationSeconds, function()
		playerService.setAllSpeed(1)
	end)
end

function WorldService.changeWeather(weather: string)
	Workspace:SetAttribute("CurrentWeather", weather)
end

function WorldService.changeTime(clockTime: number)
	Lighting.ClockTime = clockTime
end

return WorldService
