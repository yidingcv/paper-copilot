#!/usr/bin/env python3
"""
Scrape papers from conference OpenReview pages.
"""

import json
import urllib.request
import urllib.parse
import time
from datetime import datetime

CONFERENCES = {
    'iclr': {
        'name': 'ICLR',
        'base_url': 'https://openreview.net',
        'venue_id': 'ICLR.cc'
    },
    'neurips': {
        'name': 'NeurIPS',
        'base_url': 'https://openreview.net',
        'venue_id': 'NeurIPS.cc'
    },
}

def fetch_iclr_papers(year=2024, max_papers=200):
    """Fetch papers from ICLR OpenReview."""
    base_url = 'https://api.openreview.net/notes'
    params = {
        'forum': 'ICLR.cc',
        'year': year,
        'limit': max_papers,
        'details': 'all'
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    papers = []
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))

        for note in data.get('notes', []):
            paper = {
                'id': f"iclr-{year}-{note.get('id', '')[:8]}",
                'venue': 'iclr',
                'year': str(year),
                'title': note.get('content', {}).get('title', ['Untitled'])[0],
                'authors': [a.get('name', a.get('email', 'Unknown')) for a in note.get('content', {}).get('authors', [])],
                'abstract': note.get('content', {}).get('abstract', ['No abstract available'])[0],
                'openReviewUrl': f"https://openreview.net/forum?id={note.get('id')}",
            }

            # Extract tags/subject areas
            keywords = note.get('content', {}).get('keywords', [])
            if keywords:
                paper['tags'] = keywords if isinstance(keywords, list) else [keywords]

            papers.append(paper)

        print(f"Fetched {len(papers)} papers from ICLR {year}")

    except Exception as e:
        print(f"Error fetching ICLR {year}: {e}")

    return papers

def fetch_neurips_papers(year=2024, max_papers=200):
    """Fetch papers from NeurIPS OpenReview."""
    base_url = 'https://api.openreview.net/notes'
    params = {
        'forum': 'NeurIPS.cc',
        'year': year,
        'limit': max_papers,
        'details': 'all'
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    papers = []
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))

        for note in data.get('notes', []):
            paper = {
                'id': f"neurips-{year}-{note.get('id', '')[:8]}",
                'venue': 'neurips',
                'year': str(year),
                'title': note.get('content', {}).get('title', ['Untitled'])[0],
                'authors': [a.get('name', a.get('email', 'Unknown')) for a in note.get('content', {}).get('authors', [])],
                'abstract': note.get('content', {}).get('abstract', ['No abstract available'])[0],
                'openReviewUrl': f"https://openreview.net/forum?id={note.get('id')}",
            }

            keywords = note.get('content', {}).get('keywords', [])
            if keywords:
                paper['tags'] = keywords if isinstance(keywords, list) else [keywords]

            papers.append(paper)

        print(f"Fetched {len(papers)} papers from NeurIPS {year}")

    except Exception as e:
        print(f"Error fetching NeurIPS {year}: {e}")

    return papers

def main():
    all_papers = []

    # Fetch ICLR papers
    for year in [2025, 2024, 2023]:
        papers = fetch_iclr_papers(year, max_papers=100)
        all_papers.extend(papers)
        time.sleep(2)

    # Fetch NeurIPS papers
    for year in [2024, 2023]:
        papers = fetch_neurips_papers(year, max_papers=100)
        all_papers.extend(papers)
        time.sleep(2)

    # Load existing data
    try:
        with open('data/conferences.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {'venues': [], 'papers': []}

    # Filter out existing conference papers and add new ones
    existing_ids = {p['id'] for p in data.get('papers', []) if p.get('venue') in ['iclr', 'neurips', 'icml', 'cvpr', 'iccv', 'eccv']}

    # Keep existing non-conference papers
    existing_papers = [p for p in data.get('papers', []) if p.get('venue') == 'arxiv']

    new_papers = [p for p in all_papers if p['id'] not in existing_ids]

    if new_papers:
        data['papers'] = existing_papers + new_papers
        print(f"Added {len(new_papers)} new conference papers")

        with open('data/conferences.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Updated data/conferences.json")
    else:
        print("No new conference papers to add")

if __name__ == '__main__':
    main()