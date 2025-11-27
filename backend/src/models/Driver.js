const User = require('./User');

class Driver {
  static async findById(id) {
    const user = await User.findById(id);
    if (!user || user.role !== 'DRIVER') {
      return null;
    }
    return user;
  }
}

module.exports = Driver;





