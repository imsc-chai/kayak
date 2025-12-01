#!/usr/bin/env node

/**
 * Pretty Kafka Monitor for Bookings Topic
 * Formats Kafka messages in a readable way
 */

const { exec } = require('child_process');
const readline = require('readline');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function formatTimestamp(timestamp) {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatBookingEvent(key, jsonValue, timestamp) {
  try {
    const event = JSON.parse(jsonValue);
    const formattedTime = formatTimestamp(timestamp);
    
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.white}📅 Time: ${formattedTime}${colors.reset}`);
    console.log(`${colors.white}🔑 Key: ${key}${colors.reset}`);
    console.log(`${colors.dim}${'-'.repeat(50)}${colors.reset}`);
    
    // Event Type with color
    let eventTypeColor = colors.white;
    switch (event.eventType) {
      case 'booking.created':
        eventTypeColor = colors.green;
        break;
      case 'booking.confirmed':
        eventTypeColor = colors.cyan;
        break;
      case 'booking.cancelled':
        eventTypeColor = colors.yellow;
        break;
      case 'booking.failed':
        eventTypeColor = colors.red;
        break;
    }
    console.log(`${colors.bright}📋 Event Type: ${eventTypeColor}${event.eventType}${colors.reset}`);
    
    // Essential Information
    console.log(`\n${colors.yellow}📦 Booking Details:${colors.reset}`);
    console.log(`   ${colors.white}Booking ID: ${event.bookingId}${colors.reset}`);
    if (event.billingId) {
      console.log(`   ${colors.white}Billing ID: ${event.billingId}${colors.reset}`);
    }
    console.log(`   ${colors.white}Type: ${event.type}${colors.reset}`);
    console.log(`   ${colors.green}Amount: $${event.totalAmountPaid}${colors.reset}`);
    console.log(`   ${colors.white}Payment: ${event.paymentMethod}${colors.reset}`);
    console.log(`   ${colors.white}Status: ${event.transactionStatus}${colors.reset}`);
    
    // Booking-specific details
    if (event.data && event.data.bookingDetails) {
      const details = event.data.bookingDetails;
      console.log(`\n${colors.yellow}✈️  Booking Information:${colors.reset}`);
      
      if (event.type === 'flight') {
        console.log(`   ${colors.white}Airline: ${details.airline || 'N/A'}${colors.reset}`);
        console.log(`   ${colors.white}Flight: ${details.flightId || 'N/A'}${colors.reset}`);
        if (details.departureAirport) {
          const dep = details.departureAirport;
          console.log(`   ${colors.white}From: ${dep.city} (${dep.code})${colors.reset}`);
        }
        if (details.arrivalAirport) {
          const arr = details.arrivalAirport;
          console.log(`   ${colors.white}To: ${arr.city} (${arr.code})${colors.reset}`);
        }
        if (details.departureDateTime) {
          const depDate = new Date(details.departureDateTime);
          console.log(`   ${colors.white}Departure: ${depDate.toLocaleString()}${colors.reset}`);
        }
        if (details.arrivalDateTime) {
          const arrDate = new Date(details.arrivalDateTime);
          console.log(`   ${colors.white}Arrival: ${arrDate.toLocaleString()}${colors.reset}`);
        }
        console.log(`   ${colors.white}Class: ${details.flightClass || 'N/A'}${colors.reset}`);
        if (details.passengers) {
          console.log(`   ${colors.white}Passengers: ${details.passengers}${colors.reset}`);
        }
      } else if (event.type === 'hotel') {
        console.log(`   ${colors.white}Hotel: ${details.hotelName || 'N/A'}${colors.reset}`);
        if (details.starRating) {
          const stars = '⭐'.repeat(details.starRating);
          console.log(`   ${colors.white}Rating: ${stars}${colors.reset}`);
        }
        console.log(`   ${colors.white}Location: ${details.city}, ${details.state}${colors.reset}`);
        if (details.checkIn) {
          console.log(`   ${colors.white}Check-in: ${details.checkIn}${colors.reset}`);
        }
        if (details.checkOut) {
          console.log(`   ${colors.white}Check-out: ${details.checkOut}${colors.reset}`);
        }
        if (details.guests) {
          console.log(`   ${colors.white}Guests: ${details.guests}${colors.reset}`);
        }
        if (details.pricePerNight) {
          console.log(`   ${colors.white}Price/Night: $${details.pricePerNight}${colors.reset}`);
        }
      } else if (event.type === 'car') {
        console.log(`   ${colors.white}Vehicle: ${details.company} ${details.model}${colors.reset}`);
        console.log(`   ${colors.white}Type: ${details.carType || 'N/A'}${colors.reset}`);
        if (details.location) {
          console.log(`   ${colors.white}Location: ${details.location.city}, ${details.location.state}${colors.reset}`);
        }
        if (details.pickupDate) {
          console.log(`   ${colors.white}Pickup: ${details.pickupDate}${colors.reset}`);
        }
        if (details.returnDate) {
          console.log(`   ${colors.white}Return: ${details.returnDate}${colors.reset}`);
        }
        if (details.dailyRentalPrice) {
          console.log(`   ${colors.white}Price/Day: $${details.dailyRentalPrice}${colors.reset}`);
        }
      }
    }
    
    // Additional info
    if (event.data && event.data.invoiceNumber) {
      console.log(`\n${colors.cyan}🧾 Invoice: ${event.data.invoiceNumber}${colors.reset}`);
    }
    
    if (event.reason) {
      console.log(`\n${colors.yellow}📝 Reason: ${event.reason}${colors.reset}`);
    }
    
    if (event.refundDetails) {
      const refund = event.refundDetails;
      console.log(`\n${colors.yellow}💰 Refund:${colors.reset}`);
      console.log(`   ${colors.white}Amount: $${refund.refundAmount}${colors.reset}`);
      console.log(`   ${colors.white}Status: ${refund.status}${colors.reset}`);
      if (refund.refundDate) {
        const refundDate = new Date(refund.refundDate);
        console.log(`   ${colors.white}Date: ${refundDate.toLocaleString()}${colors.reset}`);
      }
    }
    
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
    
  } catch (error) {
    // Fallback to raw output if parsing fails
    console.log(`\n[${formatTimestamp(timestamp)}] Key: ${key}`);
    console.log(jsonValue);
    console.log('');
  }
}

// Start Kafka consumer
console.log(`${colors.cyan}Monitoring Kafka 'bookings' topic...${colors.reset}`);
console.log(`${colors.yellow}Press Ctrl+C to stop monitoring${colors.reset}\n`);

const kafkaProcess = exec(
  'docker exec -i kayak-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic bookings --from-beginning --property print.timestamp=true --property print.key=true --property print.value=true',
  (error, stdout, stderr) => {
    if (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      return;
    }
  }
);

// Parse output line by line
const rl = readline.createInterface({
  input: kafkaProcess.stdout,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  // Parse format: CreateTime:timestamp    key    jsonValue
  const match = line.match(/^CreateTime:(\d+)\s+(\S+)\s+(.+)$/);
  if (match) {
    const timestamp = match[1];
    const key = match[2];
    const jsonValue = match[3];
    formatBookingEvent(key, jsonValue, timestamp);
  }
});

kafkaProcess.stderr.on('data', (data) => {
  console.error(`${colors.red}${data}${colors.reset}`);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Stopping monitor...${colors.reset}`);
  kafkaProcess.kill();
  rl.close();
  process.exit(0);
});

