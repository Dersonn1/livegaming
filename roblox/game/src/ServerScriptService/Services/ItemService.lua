--[[
	Minimal per-player inventory: a Folder of IntValues under the player
	instance, one per itemId, tracking quantity. Real games will likely
	replace this with their own inventory/DataStore system — GIVE_ITEM and
	REMOVE_ITEM only need `getOrCreateInventory` and the two methods below
	to stay wired to that system instead.
]]

local Players = game:GetService("Players")

local ItemService = {}

local function getOrCreateInventory(player: Player): Folder
	local inventory = player:FindFirstChild("Inventory")
	if not inventory then
		inventory = Instance.new("Folder")
		inventory.Name = "Inventory"
		inventory.Parent = player
	end
	return inventory :: Folder
end

local function adjustItem(player: Player, itemId: string, delta: number)
	local inventory = getOrCreateInventory(player)
	local entry = inventory:FindFirstChild(itemId) :: IntValue?
	if not entry then
		entry = Instance.new("IntValue")
		entry.Name = itemId
		entry.Value = 0
		entry.Parent = inventory
	end
	entry.Value = math.max(0, entry.Value + delta)
end

function ItemService.giveItemToAll(itemId: string, quantity: number)
	for _, player in ipairs(Players:GetPlayers()) do
		adjustItem(player, itemId, quantity)
	end
end

function ItemService.removeItemFromAll(itemId: string, quantity: number)
	for _, player in ipairs(Players:GetPlayers()) do
		adjustItem(player, itemId, -quantity)
	end
end

return ItemService
