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
      // Check if this is a Mermaid table by looking for code blocks with Mermaid content
      const rows = node.getChildren();
      let isMermaidTable = false;
      
      // Check if any cell contains Mermaid code (graph TD, flowchart, etc.)
      rows.forEach((row: any) => {
        const cells = row.getChildren();
        cells.forEach((cell: any) => {
          const cellText = cell.getTextContent() || '';
          if (cellText.includes('graph TD') || cellText.includes('flowchart') || 
              cellText.includes('sequenceDiagram') || cellText.includes('classDiagram') ||
              cellText.includes('stateDiagram') || cellText.includes('erDiagram') ||
              cellText.includes('journey') || cellText.includes('gantt')) {
            isMermaidTable = true;
          }
        });
      });
      
      if (isMermaidTable && rows.length > 0) {
        // Generate HTML table for Mermaid content
        markdown += '<table>\n';
        
        rows.forEach((row: any, rowIndex: number) => {
          const cells = row.getChildren();
          
          if (rowIndex === 0) {
            // Header row
            markdown += '  <thead>\n    <tr>\n';
            cells.forEach((cell: any) => {
              const cellText = cell.getTextContent() || '';
              markdown += `      <th>${cellText}</th>\n`;
            });
            markdown += '    </tr>\n  </thead>\n  <tbody>\n';
          } else {
            // Content row
            markdown += '    <tr>\n';
            cells.forEach((cell: any) => {
              // Extract images from this cell
              const cellImages = extractImagesRecursively(cell);
              const cellText = cell.getTextContent() || '';
              
              markdown += '      <td>\n';
              
              if (cellImages.length > 0) {
                // Render image with proper HTML
                cellImages.forEach(img => {
                  markdown += `        <img src="${img.url}" alt="${img.imageId}" style="max-width: 100%; height: auto;" />\n`;
                });
              } else if (cellText.trim()) {
                // Check if it's Mermaid code content
                if (cellText.includes('graph TD') || cellText.includes('flowchart') || 
                    cellText.includes('sequenceDiagram') || cellText.includes('classDiagram') ||
                    cellText.includes('stateDiagram') || cellText.includes('erDiagram') ||
                    cellText.includes('journey') || cellText.includes('gantt')) {
                  // Render as regular code block (no Mermaid rendering)
                  markdown += '        <pre><code>\n';
                  markdown += cellText + '\n';
                  markdown += '        </code></pre>\n';
                } else {
                  // Regular text content
                  markdown += `        ${cellText}\n`;
                }
              }
              
              markdown += '      </td>\n';
            });
            markdown += '    </tr>\n';
          }
        });
        
        markdown += '  </tbody>\n</table>\n\n';
      } else {
        // Convert to HTML table with proper alignment for MDX
        if (rows.length > 0) {
          markdown += '\n<table style="width: 100%">\n';
          
          rows.forEach((row: any, rowIndex: number) => {
            const cells = row.getChildren();
            
            if (rowIndex === 0) {
              // Header row
              markdown += '  <thead>\n    <tr>\n';
              cells.forEach((cell: any) => {
                const cellText = cell.getTextContent() || '';
                markdown += `      <th style="vertical-align: top; padding: 12px">${cellText}</th>\n`;
              });
              markdown += '    </tr>\n  </thead>\n  <tbody>\n';
            } else {
              // Content row
              markdown += '    <tr>\n';
              cells.forEach((cell: any) => {
                // Extract all images from this cell recursively
                const cellImages = extractImagesRecursively(cell);
                
                // Get text content and clean it of internal line breaks
                let cellText = cell.getTextContent() || '';
                cellText = cellText.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
                
                markdown += '      <td style="vertical-align: top; padding: 12px">\n';
                
                // Render images with block display for proper alignment
                if (cellImages.length > 0) {
                  cellImages.forEach(img => {
                    markdown += `        <img src="${img.url}" alt="${img.imageId}" style="display: block; max-width: 100%; height: auto" />\n`;
                  });
                }
                
                // Add text content if available
                if (cellText.trim()) {
                  if (cellImages.length > 0) {
                    markdown += `        <p>${cellText}</p>\n`;
                  } else {
                    markdown += `        ${cellText}\n`;
                  }
                } else if (cellImages.length === 0) {
                  markdown += '        \n';
                }
                
                markdown += '      </td>\n';
              });
              markdown += '    </tr>\n';
            }
          });
          
          markdown += '  </tbody>\n</table>\n\n';
        }
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