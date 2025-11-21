const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', '..', 'data', 'users.json');

const ensureFile = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
};

const readUsers = async () => {
  ensureFile();
  const file = await fs.promises.readFile(dataFilePath, 'utf-8');
  return JSON.parse(file || '[]');
};

const writeUsers = async (users) => {
  await fs.promises.writeFile(dataFilePath, JSON.stringify(users, null, 2));
};

exports.findByEmail = async (email) => {
  const users = await readUsers();
  return users.find((user) => user.email === email.toLowerCase());
};

exports.findById = async (id) => {
  const users = await readUsers();
  return users.find((user) => user.id === id);
};

exports.create = async (user) => {
  const users = await readUsers();
  users.push(user);
  await writeUsers(users);
  return user;
};


