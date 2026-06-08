const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get the next sequential number atomically.
 * If the counter does not yet exist, it queries the target model's highest sequential field to initialize the counter.
 *
 * @param {string} sequenceName Unique counter ID (e.g. 'saleNumber')
 * @param {string} modelName Target model name (e.g. 'Sale')
 * @param {string} fieldName The field containing the sequential number string (e.g. 'saleNumber')
 */
const getNextSequenceValue = async (sequenceName, modelName, fieldName) => {
  let counter = await Counter.findById(sequenceName);

  if (!counter) {
    const Model = mongoose.model(modelName);
    // Sort descending on the sequential field name to find the maximum existing value
    const lastDoc = await Model.findOne({}, { [fieldName]: 1 }).sort({ [fieldName]: -1 });

    let maxSeq = 0;
    if (lastDoc && lastDoc[fieldName]) {
      const match = lastDoc[fieldName].match(/\d+/);
      if (match) {
        maxSeq = parseInt(match[0], 10);
      }
    }

    try {
      counter = await Counter.create({ _id: sequenceName, seq: maxSeq });
    } catch (err) {
      // Ignore unique collision if another thread created it concurrently
      if (err.code !== 11000) {
        throw err;
      }
    }
  }

  const sequenceDocument = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return sequenceDocument.seq;
};

module.exports = {
  Counter,
  getNextSequenceValue
};
