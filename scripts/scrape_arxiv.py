#!/usr/bin/env python3
"""
Scrape papers from arXiv using the arXiv API.
"""

import json
import urllib.request
import urllib.parse
import time
from datetime import datetime

ARXIV_CATEGORIES = {
    'cs.AI': 'Artificial Intelligence',
    'cs.LG': 'Machine Learning',
    'cs.CV': 'Computer Vision',
    'cs.CL': 'Computation and Language',
    'cs.NE': 'Neural and Evolutionary Computing',
}

def fetch_arxiv_papers(category='cs.AI', max_results=100):
    """Fetch recent papers from arXiv for a given category."""
    base_url = 'http://export.arxiv.org/api/query?'
    query = f'cat:{category}+AND+submittedDate:[20240101000000+TO+20261231235959]'
    params = {
        'search_query': query,
        'start': 0,
        'max_results': max_results,
        'sortBy': 'submittedDate',
        'sortOrder': 'descending'
    }

    url = base_url + urllib.parse.urlencode(params)

    papers = []
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read().decode('utf-8')

        # Simple XML parsing (in production, use feedparser library)
        entries = data.split('<entry>')
        for entry in entries[1:]:
            paper = {}

            # Extract title
            title_start = entry.find('<title>') + 7
            title_end = entry.find('</title>')
            if title_start > 6 and title_end > title_start:
                paper['title'] = ' '.join(entry[title_start:title_end].split())

            # Extract authors
            authors = []
            author_starts = [i for i in range(len(entry)) if entry[i:i+8] == '<author>']
            for start in author_starts:
                name_start = entry.find('<name>', start) + 6
                name_end = entry.find('</name>', start)
                if name_start > start and name_end > name_start:
                    authors.append(entry[name_start:name_end])
            paper['authors'] = authors

            # Extract abstract
            summary_start = entry.find('<summary>') + 9
            summary_end = entry.find('</summary>')
            if summary_start > 8 and summary_end > summary_start:
                paper['abstract'] = ' '.join(entry[summary_start:summary_end].split())

            # Extract ID
            id_start = entry.find('<id>') + 4
            id_end = entry.find('</id>')
            if id_start > 3 and id_end > id_start:
                arxiv_url = entry[id_start:id_end]
                paper['arxivId'] = arxiv_url.split('/')[-1]

            # Extract published date
            published_start = entry.find('<published>') + 10
            published_end = entry.find('</published>')
            if published_start > 9 and published_end > published_start:
                paper['year'] = entry[published_start:published_end].split('-')[0]

            if paper.get('title') and paper.get('arxivId'):
                paper['id'] = f"arxiv-{paper['arxivId']}"
                paper['venue'] = 'arxiv'
                paper['category'] = category
                papers.append(paper)

        print(f"Fetched {len(papers)} papers from arXiv {category}")

    except Exception as e:
        print(f"Error fetching arXiv {category}: {e}")

    return papers

def main():
    all_papers = []

    for category in ARXIV_CATEGORIES.keys():
        papers = fetch_arxiv_papers(category, max_results=50)
        all_papers.extend(papers)
        time.sleep(3)  # Be respectful to arXiv API

    # Load existing data
    try:
        with open('data/conferences.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {'venues': [], 'papers': []}

    # Filter out existing arXiv papers and add new ones
    existing_ids = {p['id'] for p in data.get('papers', []) if p.get('venue') == 'arxiv'}
    new_papers = [p for p in all_papers if p['id'] not in existing_ids]

    if new_papers:
        data['papers'] = new_papers + data['papers']
        print(f"Added {len(new_papers)} new arXiv papers")

        with open('data/conferences.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Updated data/conferences.json")
    else:
        print("No new arXiv papers to add")

if __name__ == '__main__':
    main()