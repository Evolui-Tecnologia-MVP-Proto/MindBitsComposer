// Universal Markdown Converter for Lexical Editor
// Handles all node types including deeply nested images in any structure

export function createMarkdownConverter() {
  let imageCounter = 1;
  const processedImageNodes = new Set<string>();

  // Universal recursive function to extract images from any node structure
  function extractImagesRecursively(node: any): Array<{imageId: string, url: string}> {
    const images: Array<{imageId: string, url: string}> = [];
    
    // Check current node for images
    if (node.getType() === 'image-with-metadata' && !processedImageNodes.has(node.getKey())) {
      processedImageNodes.add(node.getKey());
      const metadataText = node.getMetadataText();
      const imageId = node.getImageId();
      
      // Extract HTTPS URL from metadata text (for global assets)
      const httpsUrlMatch = metadataText.match(/\[(https?:\/\/.*?)\]/);
      const httpsUrl = httpsUrlMatch ? httpsUrlMatch[1] : '';
      
      // Extract blob URL from metadata text (for local uploads)
      const blobUrlMatch = metadataText.match(/\[blob:(.*?)\]/);
      const blobUrl = blobUrlMatch ? blobUrlMatch[1] : '';
      
      let finalUrl = '';
      if (httpsUrl) {
        finalUrl = httpsUrl;
      } else if (blobUrl) {
        finalUrl = `blob:${blobUrl}`;
      } else {
        finalUrl = node.getSrc();
      }
      
      images.push({imageId, url: finalUrl});
      imageCounter++;
    } else if (node.getType() === 'image' && !processedImageNodes.has(node.getKey())) {
      processedImageNodes.add(node.getKey());
      const src = node.getSrc();
      const imageId = `img_${imageCounter}`;
      images.push({imageId, url: src});
      imageCounter++;
    }
    
    // Recursively check all children regardless of node type
    if (node.getChildren) {
      const children = node.getChildren();
      children.forEach((child: any) => {
        const childImages = extractImagesRecursively(child);
        images.push(...childImages);
      });
    }
    
    return images;
  }

  function processNode(node: any): string {
    let markdown = '';

    if (node.getType() === 'heading') {
      const level = node.getTag().replace('h', '');
      const text = node.getTextContent();
      markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
    } else if (node.getType() === 'quote') {
      const text = node.getTextContent();
      markdown += '> ' + text + '\n\n';
    } else if (node.getType() === 'list') {
      const items = node.getChildren();
      items.forEach((item: any, index: number) => {
        const text = item.getTextContent();
        if (node.getListType() === 'bullet') {
          markdown += '- ' + text + '\n';
        } else {
          markdown += (index + 1) + '. ' + text + '\n';
        }
      });
      markdown += '\n';
    } else if (node.getType() === 'code') {
      const text = node.getTextContent();
      markdown += '```\n' + text + '\n```\n\n';
    } else if (node.getType() === 'paragraph') {
      const text = node.getTextContent();
      const paragraphImages = extractImagesRecursively(node);
      
      if (paragraphImages.length > 0) {
        paragraphImages.forEach(img => {
          markdown += `![${img.imageId}](${img.url})\n\n`;
        });
      }
      
      // Add text content if available and no images overlapping
      if (text.trim() && paragraphImages.length === 0) {
        markdown += text + '\n\n';
      }
    } else if (node.getType() === 'image' || node.getType() === 'image-with-metadata') {
      const nodeImages = extractImagesRecursively(node);
      nodeImages.forEach(img => {
        markdown += `![${img.imageId}](${img.url})\n\n`;
      });
    } else if (node.getType() === 'table') {
      // Process table with universal image extraction
      const rows = node.getChildren();
      if (rows.length > 0) {
        rows.forEach((row: any, rowIndex: number) => {
          const cells = row.getChildren();
          let rowContent = '|';
          
          cells.forEach((cell: any) => {
            // Extract all images from this cell recursively
            const cellImages = extractImagesRecursively(cell);
            
            // Get text content
            let cellText = cell.getTextContent() || '';
            
            // Combine text and images
            let cellContent = cellText.trim();
            if (cellImages.length > 0) {
              const imageMarkdown = cellImages.map(img => `![${img.imageId}](${img.url})`).join(' ');
              cellContent = cellContent ? `${cellContent} ${imageMarkdown}` : imageMarkdown;
            }
            
            if (!cellContent.trim()) {
              cellContent = ' ';
            }
            
            rowContent += ` ${cellContent} |`;
          });
          
          markdown += rowContent + '\n';
          
          // Add separator after header (first row)
          if (rowIndex === 0) {
            let separator = '|';
            cells.forEach(() => {
              separator += ' --- |';
            });
            markdown += separator + '\n';
          }
        });
        markdown += '\n';
      }
    } else if (node.getType() === 'collapsible-container') {
      // Process collapsible container
      const containerChildren = node.getChildren();
      containerChildren.forEach((child: any) => {
        if (child.getType() === 'collapsible-title') {
          const titleText = child.getTextContent();
          markdown += `# ${titleText}\n\n`;
        } else if (child.getType() === 'collapsible-content') {
          // Process content recursively
          const contentChildren = child.getChildren();
          contentChildren.forEach((contentChild: any) => {
            markdown += processNode(contentChild);
          });
        }
      });
    } else {
      // For any other node type, extract images first
      const nodeImages = extractImagesRecursively(node);
      nodeImages.forEach(img => {
        markdown += `![${img.imageId}](${img.url})\n\n`;
      });
      
      // Continue processing children for other content
      if (node.getChildren) {
        const children = node.getChildren();
        children.forEach((child: any) => {
          // Skip nodes that were already processed for images
          if (child.getType() !== 'image-with-metadata' && child.getType() !== 'image') {
            markdown += processNode(child);
          }
        });
      }
    }

    return markdown;
  }

  return {
    convert: (rootNode: any): string => {
      // Reset state for new conversion
      imageCounter = 1;
      processedImageNodes.clear();
      
      let markdown = '';
      const children = rootNode.getChildren();
      
      children.forEach((child: any) => {
        markdown += processNode(child);
      });
      
      return markdown.trim();
    }
  };
}