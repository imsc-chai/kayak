const mongoose = require('mongoose');

const analyticsClickSchema = new mongoose.Schema({
  clickType: {
    type: String,
    enum: ['page', 'property', 'section'],
    required: true,
    index: true
  },
  pageName: {
    type: String,
    required: function() {
      return this.clickType === 'page';
    },
    index: true
  },
  propertyId: {
    type: String,
    required: function() {
      return this.clickType === 'property';
    },
    index: true
  },
  propertyType: {
    type: String,
    enum: ['flight', 'hotel', 'car'],
    required: function() {
      return this.clickType === 'property';
    },
    index: true
  },
  sectionName: {
    type: String,
    required: function() {
      return this.clickType === 'section';
    },
    index: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
analyticsClickSchema.index({ clickType: 1, timestamp: -1 });
analyticsClickSchema.index({ propertyType: 1, timestamp: -1 });
analyticsClickSchema.index({ sectionName: 1, timestamp: -1 });

module.exports = mongoose.model('AnalyticsClick', analyticsClickSchema);

