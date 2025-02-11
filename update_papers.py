import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import sys
import re

# Configuration
SEARCH_QUERY = "science"
MAX_RESULTS = 10  # Number of papers to fetch
OUTPUT_FILE = "papers.html"

def fetch_arxiv_papers(query, max_results=10):
    url = (
        f"http://export.arxiv.org/api/query?"
        f"search_query=all:{query}&start=0&max_results={max_results}&"
        f"sortBy=lastUpdatedDate&sortOrder=descending"
    )
    try:
        response = requests.get(url)
        print(f"Fetching arXiv papers with URL: {url}")
        print(f"Status Code: {response.status_code}")
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from arXiv API: {e}")
        sys.exit(1)

def parse_arxiv_response(xml_data):
    # Define the namespaces
    namespaces = {
        'atom': 'http://www.w3.org/2005/Atom',
        'arxiv': 'http://arxiv.org/schemas/atom'
    }
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"Error parsing XML data: {e}")
        sys.exit(1)
    
    papers = []
    for entry in root.findall('atom:entry', namespaces):
        title = entry.find('atom:title', namespaces).text.strip().replace('\n', ' ')
        authors = ', '.join(
            [author.find('atom:name', namespaces).text for author in entry.findall('atom:author', namespaces)]
        )
        abstract = entry.find('atom:summary', namespaces).text.strip().replace('\n', ' ')
        
        # Find the PDF URL
        pdf_url = ""
        for link in entry.findall('atom:link', namespaces):
            if link.attrib.get('title') == 'pdf':
                pdf_url = link.attrib['href']
                break
        
        paper = {
            'title': title,
            'authors': authors,
            'abstract': abstract,
            'pdf_url': pdf_url
        }
        papers.append(paper)
    
    print(f"Parsed {len(papers)} papers from the arXiv response.")
    return papers

def generate_html(papers):
    paper_items = ""
    for paper in papers:
        paper_items += f"""
        <div class="paper">
            <h3><a href="{paper['pdf_url']}" target="_blank">{paper['title']}</a></h3>
            <p><strong>Authors:</strong> {paper['authors']}</p>
            <p>{paper['abstract']}</p>
        </div>
        <hr>
        """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    # Append a unique timestamp to ensure Git detects changes
    footer = f"<p>Last updated: {timestamp}</p>"
    complete_html = paper_items + footer
    return complete_html, timestamp

def update_html_file(paper_html, timestamp, output_file):
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: {output_file} not found.")
        sys.exit(1)
    
    # Replace the papers placeholder with the new content
    if '<!-- Papers will be dynamically inserted here -->' not in content:
        print("Error: Papers placeholder not found in papers.html.")
        sys.exit(1)
    new_content = content.replace('<!-- Papers will be dynamically inserted here -->', paper_html)
    
    # Use regex to replace the 'Last updated' line
    # This ensures that the timestamp is always updated
    new_content, num_subs = re.subn(r'Last updated: .+', f'Last updated: {timestamp}', new_content)
    
    if num_subs == 0:
        print("Error: Last updated line not found in papers.html.")
        sys.exit(1)
    
    print("true/false")
    print(new_content == content)
    print("true/false")
    
    if new_content == content:
        print("No changes detected in papers.html.")
    else:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {output_file} successfully.")

def main():
    print("Starting arXiv papers update process...")
    xml_data = fetch_arxiv_papers(SEARCH_QUERY, MAX_RESULTS)
    
    # Optional: Print the first 1000 characters of the raw XML for debugging
    print("Raw XML Response (first 1000 characters):\n", xml_data[:1000], "\n")
    
    papers = parse_arxiv_response(xml_data)
    if not papers:
        print("No papers found. Please check your query or the arXiv API response.")
    else:
        paper_html, timestamp = generate_html(papers)
        update_html_file(paper_html, timestamp, OUTPUT_FILE)
        
        # Print extracted papers for verification
        print("\nExtracted Papers:")
        for i, paper in enumerate(papers, start=1):
            print(f"\nPaper {i}:")
            print(f"Title: {paper['title']}")
            print(f"Authors: {paper['authors']}")
            print(f"Abstract: {paper['abstract'][:300]}...")  # Print only the first 300 characters for readability
            print(f"PDF URL: {paper['pdf_url']}")

if __name__ == "__main__":
    main()