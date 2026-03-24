#!/bin/bash

# Hygieia Cron Jobs - Quick Testing Script
# This script helps test the three cron jobs

GATEWAY_URL="http://localhost:3000"
ENDPOINT="/admin/cron-test"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Hygieia Cron Jobs - Testing Script                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_menu() {
    echo "${BLUE}Available Tests:${NC}"
    echo "1) Test Nutrition Summary (Weekly)"
    echo "2) Test Monthly Adherence Tracking"
    echo "3) Test Daily Medicine Reminders"
    echo "4) Test All Cron Jobs"
    echo "5) Monitor Scheduler Logs"
    echo "6) Monitor Mailer Logs"
    echo "7) Exit"
    echo ""
}

test_nutrition() {
    echo "${YELLOW}Testing: Weekly Nutrition Summary...${NC}"
    curl -X POST "$GATEWAY_URL$ENDPOINT/nutrition-summary" -H "Content-Type: application/json" | jq .
    echo ""
}

test_adherence() {
    echo "${YELLOW}Testing: Monthly Adherence Tracking...${NC}"
    curl -X POST "$GATEWAY_URL$ENDPOINT/monthly-adherence" -H "Content-Type: application/json" | jq .
    echo ""
}

test_medicine() {
    echo "${YELLOW}Testing: Daily Medicine Reminders...${NC}"
    curl -X POST "$GATEWAY_URL$ENDPOINT/medicine-reminders" -H "Content-Type: application/json" | jq .
    echo ""
}

test_all() {
    echo "${YELLOW}Testing: All Cron Jobs...${NC}"
    curl -X POST "$GATEWAY_URL$ENDPOINT/all" -H "Content-Type: application/json" | jq .
    echo ""
}

monitor_scheduler() {
    echo "${YELLOW}Monitoring Scheduler Logs (press Ctrl+C to stop)...${NC}"
    docker logs scheduler -f | grep -E "(Starting|Completed|error|Error)"
}

monitor_mailer() {
    echo "${YELLOW}Monitoring Mailer Logs (press Ctrl+C to stop)...${NC}"
    docker logs mailer -f | grep -E "(sent|failed|error|Error)"
}

# Main loop
while true; do
    show_menu
    read -p "Select option (1-7): " choice
    
    case $choice in
        1) test_nutrition ;;
        2) test_adherence ;;
        3) test_medicine ;;
        4) test_all ;;
        5) monitor_scheduler ;;
        6) monitor_mailer ;;
        7) 
            echo "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo "${YELLOW}Invalid option. Please try again.${NC}"
            ;;
    esac
done
