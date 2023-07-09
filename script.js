const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");
const crypto = require("crypto");
// Директория для хранения конфигурационных файлов
const configDirectory = "./wireguard-configs/";

// Добавляем путь к директории с wg-keygen в переменную среды PATH
process.env.PATH += ":/путь_к_директории_с_wg-keygen";

// Функция для генерации приватного ключа
async function generatePrivateKey() {
  try {
    const { stdout } = await exec("wg genkey");
    const privateKey = stdout.trim();

    return privateKey;
  } catch (error) {
    console.error("Ошибка при генерации приватного ключа:", error);
    return null;
  }
}

// Функция для генерации публичного ключа на основе приватного ключа
async function generatePublicKey(privateKey) {
  try {
    const { stdout } = await exec(`echo ${privateKey} | wg pubkey`);
    const publicKey = stdout.trim();

    return publicKey;
  } catch (error) {
    console.error("Ошибка при генерации публичного ключа:", error);
    return null;
  }
}

async function generatePresharedKey() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        const psk = buffer.toString("base64");
        resolve(psk);
      }
    });
  });
}
// Функция для генерации конфигурационного файла WireGuard
async function generateConfig(clientName) {
  try {
    // Generate keys for the client
    const privateKeyPromise = generatePrivateKey();
    const privateKey = await privateKeyPromise;
    const publicKey = await generatePublicKey(privateKey);
    const presharedKey = await generatePresharedKey();
    // Generate other parameters
    const address = generateRandomIP();
    // const dns = generateRandomDNS();
    const dns = "1.1.1.1, 1.0.0.1";
    const endpoint = generateRandomEndpoint() + ":" + generateRandomPort();
    const allowedIPs = "0.0.0.0/0, ::/0";
    const persistentKeepalive = 25;

    // Format the configuration file content
    const configContent = `# VPN CONFIG
[Interface]
Address = ${address}
DNS = ${dns}
PrivateKey = ${privateKey}
MTU = 1280

[Peer]
PublicKey = ${publicKey}
PresharedKey = ${presharedKey}
AllowedIPs = ${allowedIPs}
Endpoint = ${endpoint}
PersistentKeepalive = ${persistentKeepalive}`;

    // Write the configuration file to disk
    const configFilePath = `${configDirectory}${clientName}.conf`;
    fs.writeFileSync(configFilePath, configContent);

    console.log(
      `Configuration file for client ${clientName} generated successfully: ${configFilePath}`
    );

    // Start the VPN connection
    const { stderr } = await exec(`wg setconf wg0 ${configFilePath}`);
    if (stderr) {
      console.error(`Error starting the VPN connection: ${stderr}`);
    } else {
      console.log("VPN connection established successfully.");
    }
  } catch (error) {
    console.error("Error generating the configuration file:", error);
  }
}

// Функция для удаления конфигурационного файла WireGuard
function deleteConfig(clientName) {
  try {
    const configFilePath = `${configDirectory}${clientName}.conf`;
    fs.unlinkSync(configFilePath);

    console.log(
      `Конфигурационный файл для клиента ${clientName} успешно удален.`
    );
  } catch (error) {
    console.error("Ошибка при удалении конфигурационного файла:", error);
  }
}

// Генерация случайного IP-адреса
function generateRandomIP() {
  // Generate a random subnet mask value between 0 and 32
  // const subnetMask = Math.floor(Math.random() * 33);
  const subnetMask = 24; //Default subnet mask value 24

  // Generate random IP address octets
  const octets = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 256)
  );

  // Join the octets and append the subnet mask
  const ipAddress = octets.join(".") + "/" + subnetMask;

  return ipAddress;
}

// Генерация случайного IP-адреса
function generateRandomEndpoint() {
  const octets = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 256)
  );
  return octets.join(".");
}

// Генерация случайных DNS-серверов
function generateRandomDNS() {
  const dnsServers = Array.from({ length: 2 }, () => generateRandomIP());
  return dnsServers.join(", ");
}

// Генерация случайного порта
function generateRandomPort() {
  return Math.floor(Math.random() * 65536);
}

// Генерация случайного диапазона IP-адресов
function generateRandomIPRange() {
  const ips = Array.from({ length: 2 }, () => generateRandomIP());
  return ips.join(", ");
}

// Генерация случайного значения persistentKeepalive
function generateRandomKeepalive() {
  return Math.floor(Math.random() * 600) + 60; // От 60 до 660
}

// Пример использования функций
generateConfig("my-client"); // Генерация конфигурационного файла для клиента с именем "my-client"
// deleteConfig("my-client"); // Удаление конфигурационного файла для клиента с именем "my-client"
