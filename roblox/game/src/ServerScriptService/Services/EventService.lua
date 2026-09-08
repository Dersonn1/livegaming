--[[
	Tracks named "special events" (e.g. double-XP, boss-rush) as simple
	boolean flags on Workspace, readable by any other game script via
	GetAttribute. This is intentionally minimal — plug your own gameplay
	logic to react to these flags changing.
]]

local Workspace = game:GetService("Workspace")

local EventService = {}

function EventService.startEvent(eventName: string)
	Workspace:SetAttribute("Event_" .. eventName, true)
end

function EventService.endEvent(eventName: string)
	Workspace:SetAttribute("Event_" .. eventName, false)
end

return EventService
