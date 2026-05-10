// Database Models - Guild Model
const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  guildName: String,
  icon: String,
  owner: String,
  prefix: {
    type: String,
    default: '!'
  },
  settings: {
    moderation: {
      enabled: { type: Boolean, default: true },
      autoModeration: { type: Boolean, default: false },
      badWords: [String],
      logChannel: String
    },
    welcome: {
      enabled: { type: Boolean, default: false },
      channel: String,
      message: String,
      role: String
    },
    music: {
      enabled: { type: Boolean, default: true },
      defaultVolume: { type: Number, default: 50 }
    },
    xp: {
      enabled: { type: Boolean, default: true },
      multiplier: { type: Number, default: 1 }
    }
  },
  roles: {
    moderator: String,
    admin: String,
    member: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
