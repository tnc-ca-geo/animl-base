const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');

class Queue {
  constructor(config) {
    this.dbFile = config.dbFile;
  }

  async init() {
    const adapter = new FileAsync(this.dbFile);
    this.db = await low(adapter);
    this.db._.mixin({ first: (array) => array[0] });
    await this.db.defaults({ imgQueue: [] }).write();
    this.size = await this.db.get('imgQueue').size().value();
  }

  async add(filePath) {
    try {
      console.log('Adding file to queue');
      await this.db.get('imgQueue').push({ path: filePath }).write();
      this.size = await this.db.get('imgQueue').size().value();
    } catch (err) {
      console.log(`Error adding ${filePath} to queue: `, err);
    }
  }

  async remove(filePath) {
    try {
      console.log('Removing file from queue');
      await this.db.get('imgQueue').remove({ path: filePath }).write();
      this.size = await this.db.get('imgQueue').size().value();
    } catch (err) {
      console.log(`Error removing ${filePath} to queue: `, err);
    }
  }

  async getFirst() {
    try {
      return await this.db.get('imgQueue').first().value();
    } catch (err) {
      console.log(`Error retrieving first job from queue: `, err);
    }
  }

  async getState() {
    try {
      return await this.db.getState();
    } catch (err) {
      console.log(`Error getting queue state: `, err);
    }
  }
}

module.exports = Queue;
