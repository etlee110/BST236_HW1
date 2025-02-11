import requests
import xml.etree.ElementTree as ET
from datetime import datetime

# Configuration
SEARCH_QUERY = "algebra"
MAX_RESULTS = 10  # Number of papers to fetch
OUTPUT_FILE = "papers.html"

def fetch_arxiv_papers(query, max_results=10):
    url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={max_results}&sortBy=lastUpdatedDate&sortOrder=descending"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data from arXiv API. Status code: {response.status_code}")
    return response.text

def parse_arxiv_response(xml_data):
    root = ET.fromstring(xml_data)
    namespace = {'arxiv': 'http://www.w3.org/2005/Atom'}
    papers = []
    for entry in root.findall('arxiv:entry', namespace):
        title = entry.find('arxiv:title', namespace).text.strip().replace('\n', ' ')
        authors = ', '.join([author.find('arxiv:name', namespace).text for author in entry.findall('arxiv:author', namespace)])
        abstract = entry.find('arxiv:summary', namespace).text.strip().replace('\n', ' ')
        pdf_url = ""
        for link in entry.findall('arxiv:link', namespace):
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
    with open(output_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace the placeholder with the new paper list
    content = content.replace('<!-- Papers will be dynamically inserted here -->', paper_html)
    # Replace the timestamp placeholder
    content = content.replace('<!-- Insert timestamp here -->', timestamp)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {output_file} successfully.")

def main():
    xml_data = fetch_arxiv_papers(SEARCH_QUERY, MAX_RESULTS)
    papers = parse_arxiv_response(xml_data)
    paper_html, timestamp = generate_html(papers)
    update_html_file(paper_html, timestamp, OUTPUT_FILE)

if __name__ == "__main__":
    main()