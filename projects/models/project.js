const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, min: 0 },
  completedTasks: { type: Number, default: 0, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  archived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);