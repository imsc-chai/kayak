#!/bin/bash
# Kafka Topic Monitor for Bookings
# This script monitors the 'bookings' topic in real-time

echo "📊 Monitoring Kafka 'bookings' topic..."
echo "Press Ctrl+C to stop monitoring"
echo ""

docker exec -it kayak-kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic bookings \
    --from-beginning \
    --property print.timestamp=true \
    --property print.key=true \
    --property print.value=true

