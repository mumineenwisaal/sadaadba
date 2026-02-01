#!/usr/bin/env python3
"""
Backend API Tests for Sadaa Instrumentals - Preview Feature Testing
Tests the preview functionality for premium instrumentals
"""

import requests
import json
import sys
from typing import List, Dict, Any

# Backend URL from environment
BACKEND_URL = "https://audio-glimpse.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"✅ PASS: {test_name}")
        
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name} - {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return self.failed == 0

def test_api_connection():
    """Test basic API connectivity"""
    results = TestResults()
    
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "Sadaa Instrumentals" in data["message"]:
                results.add_pass("API Connection")
            else:
                results.add_fail("API Connection", f"Unexpected response: {data}")
        else:
            results.add_fail("API Connection", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("API Connection", f"Connection error: {str(e)}")
    
    return results

def seed_database():
    """Seed the database with sample data"""
    try:
        response = requests.post(f"{BACKEND_URL}/seed", timeout=10)
        if response.status_code == 200:
            print("✅ Database seeded successfully")
            return True
        else:
            print(f"❌ Failed to seed database: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        return False

def test_preview_feature():
    """Test the preview feature for premium instrumentals"""
    results = TestResults()
    
    # Test 1: GET /api/instrumentals - Check all instrumentals
    try:
        response = requests.get(f"{BACKEND_URL}/instrumentals", timeout=10)
        if response.status_code != 200:
            results.add_fail("Get All Instrumentals", f"Status code: {response.status_code}")
            return results
            
        instrumentals = response.json()
        if not instrumentals:
            results.add_fail("Get All Instrumentals", "No instrumentals returned")
            return results
            
        results.add_pass("Get All Instrumentals")
        
        # Analyze premium vs free tracks
        premium_tracks = [track for track in instrumentals if track.get('is_premium', False)]
        free_tracks = [track for track in instrumentals if not track.get('is_premium', False)]
        
        print(f"📊 Found {len(premium_tracks)} premium tracks and {len(free_tracks)} free tracks")
        
        # Test 2: Verify premium tracks have preview fields populated
        premium_with_preview = 0
        premium_without_preview = 0
        
        for track in premium_tracks:
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            
            if preview_start is not None and preview_end is not None:
                premium_with_preview += 1
                
                # Test 4: Verify preview time range makes sense
                if preview_start >= preview_end:
                    results.add_fail("Preview Time Range", 
                                   f"Track '{track['title']}': preview_start ({preview_start}) >= preview_end ({preview_end})")
                else:
                    duration = preview_end - preview_start
                    if duration < 10 or duration > 60:
                        results.add_fail("Preview Duration", 
                                       f"Track '{track['title']}': preview duration {duration}s is not reasonable (should be 10-60s)")
                    else:
                        # This is a good preview range
                        pass
            else:
                premium_without_preview += 1
        
        if premium_with_preview > 0:
            results.add_pass("Premium Tracks Have Preview Fields")
        else:
            results.add_fail("Premium Tracks Have Preview Fields", 
                           f"No premium tracks have preview fields set")
        
        # Test 3: Verify free tracks have preview fields as null
        free_with_preview = 0
        for track in free_tracks:
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            
            if preview_start is not None or preview_end is not None:
                free_with_preview += 1
        
        if free_with_preview == 0:
            results.add_pass("Free Tracks Have No Preview Fields")
        else:
            results.add_fail("Free Tracks Have No Preview Fields", 
                           f"{free_with_preview} free tracks have preview fields set")
        
        print(f"📊 Premium tracks with preview: {premium_with_preview}/{len(premium_tracks)}")
        print(f"📊 Free tracks with preview: {free_with_preview}/{len(free_tracks)}")
        
    except Exception as e:
        results.add_fail("Get All Instrumentals", f"Exception: {str(e)}")
        return results
    
    # Test 5: GET /api/instrumentals?is_premium=true
    try:
        response = requests.get(f"{BACKEND_URL}/instrumentals?is_premium=true", timeout=10)
        if response.status_code != 200:
            results.add_fail("Get Premium Only", f"Status code: {response.status_code}")
        else:
            premium_only = response.json()
            
            # Verify all returned tracks are premium
            non_premium_count = 0
            tracks_with_preview = 0
            
            for track in premium_only:
                if not track.get('is_premium', False):
                    non_premium_count += 1
                
                if track.get('preview_start') is not None and track.get('preview_end') is not None:
                    tracks_with_preview += 1
            
            if non_premium_count == 0:
                results.add_pass("Premium Filter Returns Only Premium")
            else:
                results.add_fail("Premium Filter Returns Only Premium", 
                               f"{non_premium_count} non-premium tracks returned")
            
            if tracks_with_preview > 0:
                results.add_pass("Premium Tracks Have Preview Times")
                print(f"📊 Premium tracks with preview times: {tracks_with_preview}/{len(premium_only)}")
            else:
                results.add_fail("Premium Tracks Have Preview Times", 
                               "No premium tracks have preview times set")
                
    except Exception as e:
        results.add_fail("Get Premium Only", f"Exception: {str(e)}")
    
    return results

def test_preview_time_validation():
    """Test specific preview time validation scenarios"""
    results = TestResults()
    
    try:
        # Get a few premium tracks to analyze their preview times
        response = requests.get(f"{BACKEND_URL}/instrumentals?is_premium=true", timeout=10)
        if response.status_code != 200:
            results.add_fail("Preview Time Validation", "Could not fetch premium tracks")
            return results
            
        premium_tracks = response.json()
        
        valid_previews = 0
        invalid_previews = 0
        
        for track in premium_tracks[:5]:  # Test first 5 premium tracks
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            track_duration = track.get('duration', 0)
            
            if preview_start is not None and preview_end is not None:
                # Check if preview times are within track duration
                if preview_start < 0 or preview_end > track_duration:
                    results.add_fail("Preview Within Track Duration", 
                                   f"Track '{track['title']}': preview times outside track duration")
                    invalid_previews += 1
                elif preview_start >= preview_end:
                    results.add_fail("Preview Start Before End", 
                                   f"Track '{track['title']}': preview_start >= preview_end")
                    invalid_previews += 1
                else:
                    valid_previews += 1
                    duration = preview_end - preview_start
                    print(f"✅ Track '{track['title']}': {duration}s preview ({preview_start}-{preview_end})")
        
        if valid_previews > 0 and invalid_previews == 0:
            results.add_pass("Preview Time Validation")
        elif invalid_previews > 0:
            results.add_fail("Preview Time Validation", f"{invalid_previews} tracks have invalid preview times")
        else:
            results.add_fail("Preview Time Validation", "No preview times found to validate")
            
    except Exception as e:
        results.add_fail("Preview Time Validation", f"Exception: {str(e)}")
    
    return results

def main():
    """Run all preview feature tests"""
    print("🎵 Sadaa Instrumentals API - Preview Feature Tests")
    print("="*60)
    
    # Test API connection first
    print("\n1. Testing API Connection...")
    connection_results = test_api_connection()
    if connection_results.failed > 0:
        print("❌ Cannot proceed - API connection failed")
        return False
    
    # Seed database
    print("\n2. Seeding Database...")
    if not seed_database():
        print("❌ Cannot proceed - database seeding failed")
        return False
    
    # Test preview feature
    print("\n3. Testing Preview Feature...")
    preview_results = test_preview_feature()
    
    # Test preview time validation
    print("\n4. Testing Preview Time Validation...")
    validation_results = test_preview_time_validation()
    
    # Combined results
    total_passed = connection_results.passed + preview_results.passed + validation_results.passed
    total_failed = connection_results.failed + preview_results.failed + validation_results.failed
    all_errors = connection_results.errors + preview_results.errors + validation_results.errors
    
    print(f"\n{'='*60}")
    print(f"🎵 PREVIEW FEATURE TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests: {total_passed + total_failed}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failed}")
    
    if all_errors:
        print(f"\n❌ FAILED TESTS:")
        for error in all_errors:
            print(f"  - {error}")
    
    if total_failed == 0:
        print(f"\n✅ ALL PREVIEW FEATURE TESTS PASSED!")
        return True
    else:
        print(f"\n❌ {total_failed} TESTS FAILED")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)