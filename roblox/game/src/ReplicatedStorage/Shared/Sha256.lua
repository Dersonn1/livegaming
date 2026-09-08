--[[
	Pure-Luau SHA-256 + HMAC-SHA256 implementation.

	Roblox does not expose any native crypto/HMAC library, so command-batch
	signature verification (SecurityService.lua) needs its own
	implementation instead of relying on an engine builtin that doesn't
	exist. This is a standard, from-spec SHA-256 built on the `bit32`
	library that ships with Luau. It is pure computation with no external
	calls, so it is safe to run on every poll response.
]]

local band, bor, bxor, bnot = bit32.band, bit32.bor, bit32.bxor, bit32.bnot
local lshift, rshift = bit32.lshift, bit32.rshift

local function rrotate(x, n)
	return bor(rshift(x, n), lshift(x, 32 - n))
end

local K = {
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
}

local function toBytes(str)
	local bytes = {}
	for i = 1, #str do
		bytes[i] = string.byte(str, i)
	end
	return bytes
end

local function sha256(message)
	local h0, h1, h2, h3 = 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a
	local h4, h5, h6, h7 = 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19

	local msgLen = #message
	local bitLen = msgLen * 8

	-- Padding: 0x80, then zeros, then 64-bit big-endian length, total length % 64 == 0
	local padded = message .. string.char(0x80)
	while (#padded % 64) ~= 56 do
		padded = padded .. string.char(0)
	end
	-- 64-bit length as 8 bytes big-endian (Roblox message sizes never approach 2^32)
	for i = 7, 0, -1 do
		padded = padded .. string.char(band(rshift(bitLen, i * 8), 0xFF))
	end

	local bytes = toBytes(padded)
	local numChunks = #bytes / 64

	for chunk = 0, numChunks - 1 do
		local w = {}
		local base = chunk * 64
		for i = 0, 15 do
			local o = base + i * 4
			w[i + 1] = bor(
				lshift(bytes[o + 1], 24),
				lshift(bytes[o + 2], 16),
				lshift(bytes[o + 3], 8),
				bytes[o + 4]
			)
		end
		for i = 17, 64 do
			local w15, w2 = w[i - 15], w[i - 2]
			local s0 = bxor(rrotate(w15, 7), rrotate(w15, 18), rshift(w15, 3))
			local s1 = bxor(rrotate(w2, 17), rrotate(w2, 19), rshift(w2, 10))
			w[i] = band(w[i - 16] + s0 + w[i - 7] + s1, 0xFFFFFFFF)
		end

		local a, b, c, d, e, f, g, h = h0, h1, h2, h3, h4, h5, h6, h7

		for i = 1, 64 do
			local S1 = bxor(rrotate(e, 6), rrotate(e, 11), rrotate(e, 25))
			local ch = bxor(band(e, f), band(bnot(e), g))
			local temp1 = band(h + S1 + ch + K[i] + w[i], 0xFFFFFFFF)
			local S0 = bxor(rrotate(a, 2), rrotate(a, 13), rrotate(a, 22))
			local maj = bxor(band(a, b), band(a, c), band(b, c))
			local temp2 = band(S0 + maj, 0xFFFFFFFF)

			h = g
			g = f
			f = e
			e = band(d + temp1, 0xFFFFFFFF)
			d = c
			c = b
			b = a
			a = band(temp1 + temp2, 0xFFFFFFFF)
		end

		h0 = band(h0 + a, 0xFFFFFFFF)
		h1 = band(h1 + b, 0xFFFFFFFF)
		h2 = band(h2 + c, 0xFFFFFFFF)
		h3 = band(h3 + d, 0xFFFFFFFF)
		h4 = band(h4 + e, 0xFFFFFFFF)
		h5 = band(h5 + f, 0xFFFFFFFF)
		h6 = band(h6 + g, 0xFFFFFFFF)
		h7 = band(h7 + h, 0xFFFFFFFF)
	end

	return string.format("%08x%08x%08x%08x%08x%08x%08x%08x", h0, h1, h2, h3, h4, h5, h6, h7)
end

local function hexToBytes(hex)
	local bytes = {}
	for i = 1, #hex, 2 do
		bytes[#bytes + 1] = tonumber(hex:sub(i, i + 1), 16)
	end
	return bytes
end

local function bytesToStr(bytes)
	local chars = {}
	for i, b in ipairs(bytes) do
		chars[i] = string.char(b)
	end
	return table.concat(chars)
end

-- HMAC-SHA256 per RFC 2104, block size 64 bytes for SHA-256.
local function hmacSha256(key, message)
	local blockSize = 64
	if #key > blockSize then
		key = bytesToStr(hexToBytes(sha256(key)))
	end
	if #key < blockSize then
		key = key .. string.rep(string.char(0), blockSize - #key)
	end

	local oKeyPad, iKeyPad = {}, {}
	for i = 1, blockSize do
		local kb = string.byte(key, i)
		oKeyPad[i] = string.char(bxor(kb, 0x5c))
		iKeyPad[i] = string.char(bxor(kb, 0x36))
	end

	local inner = sha256(table.concat(iKeyPad) .. message)
	local innerBytes = bytesToStr(hexToBytes(inner))
	return sha256(table.concat(oKeyPad) .. innerBytes)
end

return {
	sha256 = sha256,
	hmacSha256 = hmacSha256,
}
