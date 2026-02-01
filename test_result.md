#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build a premium Flutter/Expo mobile application for Dawoodi Bohra instrumental madeh music called 'Sadaa Instrumentals' with calm spiritual UI, home screen with featured banner, mood filters, free/premium instrumentals sections, search & filter, full-screen player with waveform, subscription system at ₹53/month"

backend:
  - task: "API Root endpoint"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/ returns version info"

  - task: "Seed database endpoint"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/seed seeds 15 sample instrumentals"

  - task: "Get instrumentals endpoint"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/instrumentals with optional mood, search filters"

  - task: "Get featured instrumentals"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/instrumentals/featured returns featured tracks"

  - task: "User creation/retrieval"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/users creates or gets existing user by device_id"

  - task: "Subscription endpoints"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Mock subscription at /api/subscription/subscribe, status check, restore"

  - task: "Preview feature for premium instrumentals"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "✅ ALL PREVIEW FEATURE TESTS PASSED! Premium tracks (9/9) have preview_start and preview_end fields populated with 30s durations. Free tracks (6/6) have null preview values. GET /api/instrumentals?is_premium=true returns only premium tracks with preview times. Preview ranges are valid (preview_start < preview_end, ~30s duration, within track bounds)."

frontend:
  - task: "Splash Screen"
    implemented: true
    working: true
    file: "app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Beautiful gradient splash with Sadaa Instrumentals branding"

  - task: "Home Screen"
    implemented: true
    working: true
    file: "app/(tabs)/home.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Featured banner, mood chips, free/premium sections all working"

  - task: "Search Screen"
    implemented: true
    working: true
    file: "app/(tabs)/search.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Search by name, filter by mood, instant results"

  - task: "Library Screen"
    implemented: true
    working: true
    file: "app/(tabs)/library.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Shows available tracks grouped by mood"

  - task: "Player Screen"
    implemented: true
    working: true
    file: "app/player.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full screen player with waveform, controls, progress bar"

  - task: "Subscription Screen"
    implemented: true
    working: true
    file: "app/subscription.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Premium screen with ₹53/month pricing, benefits, subscribe/restore"

  - task: "Tab Navigation"
    implemented: true
    working: true
    file: "app/(tabs)/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Home, Search, Library tabs with icons"

  - task: "State Management"
    implemented: true
    working: true
    file: "store/appStore.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Zustand store managing user, instrumentals, playback state"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Preview feature for premium tracks"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "MVP complete. All screens implemented: Splash, Home (featured banner, mood filters, free/premium sections), Search, Library, Player (with animated waveform), Subscription (₹53/month with mock payment). Backend APIs working. Visual verification done via screenshots."
  - agent: "main"
    message: "Implemented offline-first functionality: (1) Playlists saved locally and visible offline (2) Favorites stored locally and accessible offline (3) Downloads show track metadata even when offline (4) Offline indicators added to Home and Library screens (5) Proper error messages when trying to play non-downloaded tracks offline (6) Track metadata stored with downloads for offline display."
  - agent: "main"
    message: "Implemented Preview Feature for Premium Tracks: (1) Added preview_start and preview_end fields to Instrumental model in backend (2) All premium tracks now have preview times stored in MongoDB (3) Created preview.tsx screen for preview playback (4) Non-premium users can now preview a portion of premium tracks (e.g., 30-second snippet from 1:10-1:40) (5) Preview badges added to track cards in Home and Search screens (6) Preview player shows progress within the preview range and prompts subscription after preview ends"
  - agent: "testing"
    message: "✅ PREVIEW FEATURE TESTING COMPLETE: All 7 tests passed. Premium instrumentals (9/9) have preview_start and preview_end fields with 30-second durations. Free tracks (6/6) correctly have null preview values. Premium filter API works correctly. Preview time ranges are valid and within track bounds. Backend API fully functional for preview feature."
