const aes256 = require("aes256");
const nodeCrypto = require("crypto");

const ENCRYPT_KEY = process.env.ENCRYPT_KEY || "my passphrase";

function encryptString(plainText) {
	if (plainText === undefined || plainText === null) return plainText;
	return aes256.encrypt(ENCRYPT_KEY, String(plainText));
}

function decryptString(cipherText) {
	if (cipherText === undefined || cipherText === null) return cipherText;
	try {
		return aes256.decrypt(ENCRYPT_KEY, String(cipherText));
	} catch (e) {
		return String(cipherText);
	}
}

function hmacSha256Hex(input) {
	const hmac = nodeCrypto.createHmac("sha256", ENCRYPT_KEY);
	hmac.update(String(input));
	return hmac.digest("hex");
}

module.exports = {
	encryptString,
	decryptString,
	hmacSha256Hex,
};
