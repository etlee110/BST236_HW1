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
    return paper_items, timestamp

def update_html_file(paper_html, timestamp, output_file):
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: {output_file} not found.")
        sys.exit(1)
    
    # Replace papers content
    def paper_replacer(match):
        return f'<!-- Papers will be dynamically inserted here -->\n{paper_html}\n<!-- END PAPERS -->'
    
    content = re.sub(
        r'<!-- Papers will be dynamically inserted here -->.*?<!-- END PAPERS -->',
        paper_replacer,
        content,
        flags=re.DOTALL
    )

    # Replace timestamp
    content = re.sub(
        r'Last updated: .*?(?=</p>)',
        f'Last updated: {timestamp}',
        content
    )

    # Replace keyword
    content = re.sub(
        r'Search keyword: .*?(?=</p>)',
        f'Search keyword: {SEARCH_QUERY}',
        content
    )

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {output_file} successfully.")

def restore_placeholders(content):
    """ Ensure that the placeholders exist in the HTML file """
    if '<!-- Papers will be dynamically inserted here -->' not in content:
        content = content.replace(
            '<div id="paper-list">', '<div id="paper-list">\n<!-- Papers will be dynamically inserted here -->\n<!-- END PAPERS -->'
        )
    
    if '<!-- Insert timestamp here -->' not in content:
        content = re.sub(
            r'Last updated: .*',
            'Last updated: <!-- Insert timestamp here -->',
            content
        )

    return content

def main():
    print("Starting arXiv papers update process...")
    xml_data = fetch_arxiv_papers(SEARCH_QUERY, MAX_RESULTS)
    
    print("Raw XML Response (first 1000 characters):\n", xml_data[:1000], "\n")
    
    papers = parse_arxiv_response(xml_data)
    if not papers:
        print("No papers found for this keyword. Updating timestamp anyway...")
    
    paper_html, timestamp = generate_html(papers)
    
    # Always call update_html_file() so timestamp is updated every time
    # even if no new papers are found.
    update_html_file(paper_html, timestamp, OUTPUT_FILE)

if __name__ == "__main__":
    main()