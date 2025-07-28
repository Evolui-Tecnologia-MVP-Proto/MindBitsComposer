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

  // Função para processar TextNodes com formatação
  function processTextNode(textNode: any): string {
    const text = textNode.getTextContent();
    if (!text) return '';
    
    let formattedText = text;
    
    // Verificar se o TextNode tem formatação aplicada
    if (textNode.hasFormat && typeof textNode.hasFormat === 'function') {
      if (textNode.hasFormat('code')) {
        formattedText = `\`${formattedText}\``;
      } else {
        // Aplicar formatações na ordem correta
        if (textNode.hasFormat('bold')) {
          formattedText = `**${formattedText}**`;
        }
        if (textNode.hasFormat('italic')) {
          formattedText = `*${formattedText}*`;
        }
        if (textNode.hasFormat('strikethrough')) {
          formattedText = `~~${formattedText}~~`;
        }
      }
    }
    
    return formattedText;
  }

  // Função para processar children de um node e preservar formatação
  function processChildrenWithFormatting(node: any): string {
    if (!node.getChildren || typeof node.getChildren !== 'function') {
      return node.getTextContent() || '';
    }
    
    const children = node.getChildren();
    let result = '';
    
    children.forEach((child: any) => {
      if (child.getType() === 'text') {
        result += processTextNode(child);
      } else {
        // Para outros tipos de nodes, processar recursivamente
        result += processNode(child);
      }
    });
    
    return result;
  }

  function processNode(node: any): string {
    let markdown = '';

    if (node.getType() === 'heading') {
      const level = node.getTag().replace('h', '');
      const text = processChildrenWithFormatting(node);
      markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
    } else if (node.getType() === 'quote') {
      const text = processChildrenWithFormatting(node);
      markdown += '> ' + text + '\n\n';
    } else if (node.getType() === 'list') {
      const items = node.getChildren();
      items.forEach((item: any, index: number) => {
        const text = processChildrenWithFormatting(item);
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
      const paragraphImages = extractImagesRecursively(node);
      
      if (paragraphImages.length > 0) {
        paragraphImages.forEach(img => {
          markdown += `![${img.imageId}](${img.url})\n\n`;
        });
      }
      
      // Processar children para preservar formatação inline
      const formattedText = processChildrenWithFormatting(node);
      if (formattedText.trim() && paragraphImages.length === 0) {
        markdown += formattedText + '\n\n';
      }
    } else if (node.getType() === 'image' || node.getType() === 'image-with-metadata') {
      const nodeImages = extractImagesRecursively(node);
      nodeImages.forEach(img => {
        markdown += `![${img.imageId}](${img.url})\n\n`;
      });
    } else if (node.getType() === 'table') {
      const rows = node.getChildren();
      
      // Check if table contains only text (no images, code blocks, or complex content)
      let isSimpleTextTable = true;
      let isMermaidTable = false;
      
      rows.forEach((row: any) => {
        const cells = row.getChildren();
        cells.forEach((cell: any) => {
          const cellText = cell.getTextContent() || '';
          
          // Check for Mermaid content
          if (cellText.includes('graph TD') || cellText.includes('flowchart') || 
              cellText.includes('sequenceDiagram') || cellText.includes('classDiagram') ||
              cellText.includes('stateDiagram') || cellText.includes('erDiagram') ||
              cellText.includes('journey') || cellText.includes('gantt')) {
            isMermaidTable = true;
            isSimpleTextTable = false;
          }
          
          // Check for complex content in cell
          if (cell.getChildren) {
            const children = cell.getChildren();
            children.forEach((child: any) => {
              const childType = child.getType();
              // If cell contains anything other than paragraphs or text nodes, it's not simple
              if (childType !== 'paragraph' && childType !== 'text') {
                isSimpleTextTable = false;
              }
              // Check for images in paragraphs
              if (childType === 'paragraph' && child.getChildren) {
                const paragraphChildren = child.getChildren();
                paragraphChildren.forEach((pChild: any) => {
                  if (pChild.getType() === 'image' || pChild.getType() === 'image-with-metadata' || 
                      pChild.getType() === 'code' || pChild.getType() === 'table') {
                    isSimpleTextTable = false;
                  }
                });
              }
            });
          }
        });
      });
      
      // Generate simple markdown table if it contains only text
      if (isSimpleTextTable && rows.length > 0) {
        // Create array to store table data
        const tableData: string[][] = [];
        
        rows.forEach((row: any) => {
          const rowData: string[] = [];
          const cells = row.getChildren();
          cells.forEach((cell: any) => {
            // Get formatted text content from cell
            const cellContent = processChildrenWithFormatting(cell).trim();
            rowData.push(cellContent);
          });
          tableData.push(rowData);
        });
        
        // Generate markdown table
        if (tableData.length > 0 && tableData[0].length > 0) {
          const columnCount = tableData[0].length;
          
          // If table has at least 2 rows, treat first as header
          if (tableData.length >= 2) {
            // Header row
            markdown += '| ' + tableData[0].join(' | ') + ' |\n';
            
            // Separator row
            markdown += '|' + ' --- |'.repeat(columnCount) + '\n';
            
            // Data rows
            for (let i = 1; i < tableData.length; i++) {
              markdown += '| ' + tableData[i].join(' | ') + ' |\n';
            }
          } else {
            // Single row table - no header
            markdown += '| ' + tableData[0].join(' | ') + ' |\n';
            markdown += '|' + ' --- |'.repeat(columnCount) + '\n';
          }
          
          markdown += '\n';
        }
      } else if (isMermaidTable && rows.length > 0) {
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
              // Process cell content to detect code blocks
              function processMermaidTableCell(cell: any): string {
                let content = '';
                let hasCodeBlock = false;
                
                if (cell.getChildren) {
                  const children = cell.getChildren();
                  children.forEach((child: any) => {
                    if (child.getType() === 'code') {
                      hasCodeBlock = true;
                      const codeText = child.getTextContent();
                      // Check if it's Mermaid code
                      if (codeText.includes('graph TD') || codeText.includes('flowchart') || 
                          codeText.includes('sequenceDiagram') || codeText.includes('classDiagram') ||
                          codeText.includes('stateDiagram') || codeText.includes('erDiagram') ||
                          codeText.includes('journey') || codeText.includes('gantt')) {
                        // Render as regular code block (no Mermaid rendering)
                        content += '        <pre><code>\n';
                        content += codeText + '\n';
                        content += '        </code></pre>\n';
                      } else {
                        // Regular code block with backticks
                        content += '        ```\n' + codeText + '\n```\n';
                      }
                    } else if (child.getType() === 'table') {
                      // Process nested table in Mermaid table cells - generate formatted HTML with proper indentation
                      const nestedRows = child.getChildren();
                      content += '<table style="width: 100%; margin: 8px 0; border-collapse: collapse;">\n';
                      content += '          <tbody>\n';
                      
                      nestedRows.forEach((nestedRow: any) => {
                        content += '            <tr>\n';
                        const nestedCells = nestedRow.getChildren();
                        nestedCells.forEach((nestedCell: any) => {
                          const nestedCellText = processChildrenWithFormatting(nestedCell).trim();
                          content += '              <td style="border: 1px solid #ccc; padding: 8px;">' + nestedCellText + '</td>\n';
                        });
                        content += '            </tr>\n';
                      });
                      
                      content += '          </tbody>\n';
                      content += '        </table>';
                    } else if (child.getType() === 'paragraph') {
                      const paragraphContent = processChildrenWithFormatting(child);
                      if (paragraphContent.trim()) {
                        content += paragraphContent;
                      }
                    } else {
                      const nodeContent = processNode(child).trim();
                      if (nodeContent) {
                        content += nodeContent;
                      }
                    }
                  });
                }
                
                // If no code block was found, return the plain text
                if (!hasCodeBlock && !content) {
                  const cellText = cell.getTextContent() || '';
                  if (cellText.trim()) {
                    content = cellText;
                  }
                }
                
                return content;
              }
              
              // Extract images from this cell
              const cellImages = extractImagesRecursively(cell);
              const cellContent = processMermaidTableCell(cell);
              
              markdown += '      <td>\n';
              
              if (cellImages.length > 0) {
                // Render image with proper HTML
                cellImages.forEach(img => {
                  markdown += `        <img src="${img.url}" alt="${img.imageId}" style="max-width: 100%; height: auto;" />\n`;
                });
              }
              
              if (cellContent.trim()) {
                markdown += cellContent;
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
          markdown += '\n<table style="width: 100%">\n  <tbody>\n';
          
          rows.forEach((row: any, rowIndex: number) => {
            const cells = row.getChildren();
            
            // All rows are content rows
            markdown += '    <tr>\n';
            cells.forEach((cell: any) => {
                // Extract images from this specific cell without affecting global processing
                function extractCellImages(node: any): Array<{imageId: string, url: string}> {
                  const images: Array<{imageId: string, url: string}> = [];
                  
                  if (node.getType() === 'image-with-metadata') {
                    const metadataText = node.getMetadataText();
                    const imageId = node.getImageId();
                    
                    const httpsUrlMatch = metadataText.match(/\[(https?:\/\/.*?)\]/);
                    const httpsUrl = httpsUrlMatch ? httpsUrlMatch[1] : '';
                    
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
                  } else if (node.getType() === 'image') {
                    const src = node.getSrc();
                    const imageId = `img_${Math.random().toString(36).substr(2, 9)}`;
                    images.push({imageId, url: src});
                  }
                  
                  if (node.getChildren) {
                    const children = node.getChildren();
                    children.forEach((child: any) => {
                      const childImages = extractCellImages(child);
                      images.push(...childImages);
                    });
                  }
                  
                  return images;
                }
                
                // Process cell content to preserve code blocks and nested tables
                function processCellContent(cell: any): string {
                  let content = '';
                  
                  if (cell.getChildren) {
                    const children = cell.getChildren();
                    children.forEach((child: any) => {
                      if (child.getType() === 'table') {
                        // Process nested table - generate formatted HTML with proper indentation
                        const nestedRows = child.getChildren();
                        content += '<table style="width: 100%; margin: 8px 0; border-collapse: collapse;">\n';
                        content += '          <tbody>\n';
                        
                        nestedRows.forEach((nestedRow: any) => {
                          content += '            <tr>\n';
                          const nestedCells = nestedRow.getChildren();
                          nestedCells.forEach((nestedCell: any) => {
                            // Get nested cell content
                            const nestedCellText = processChildrenWithFormatting(nestedCell).trim();
                            content += '              <td style="border: 1px solid #ccc; padding: 8px;">' + nestedCellText + '</td>\n';
                          });
                          content += '            </tr>\n';
                        });
                        
                        content += '          </tbody>\n';
                        content += '        </table>';
                      } else if (child.getType() === 'code') {
                        // Preserve code blocks with backticks
                        const codeText = child.getTextContent();
                        content += '        ```\n' + codeText + '\n```\n';
                      } else if (child.getType() === 'paragraph') {
                        // Process paragraph content for inline formatting
                        const paragraphContent = processChildrenWithFormatting(child);
                        if (paragraphContent.trim()) {
                          content += paragraphContent;
                        }
                      } else {
                        // For other types, get formatted content
                        const nodeContent = processNode(child).trim();
                        if (nodeContent) {
                          content += nodeContent;
                        }
                      }
                    });
                  }
                  
                  return content;
                }
                
                const cellImages = extractCellImages(cell);
                const cellContent = processCellContent(cell);
                
                markdown += '      <td style="vertical-align: top; padding: 12px">';
                
                // Render images with block display for proper alignment
                if (cellImages.length > 0) {
                  cellImages.forEach(img => {
                    markdown += `        <img src="${img.url}" alt="${img.imageId}" style="display: block; max-width: 100%; height: auto" />\n`;
                  });
                }
                
                // Add processed content if available
                if (cellContent.trim()) {
                  // Check if content has nested table
                  if (cellContent.includes('<table')) {
                    markdown += '\n        ' + cellContent.trim() + '\n      ';
                  } else {
                    markdown += cellContent;
                  }
                } else if (cellImages.length === 0) {
                  // If no content and no images, add empty space
                  markdown += '';
                }
                
                markdown += '</td>\n';
              });
              markdown += '    </tr>\n';
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
          
          // Determine if this is a header section or regular section
          // Header sections contain template fields like "RAG Index", "Titulo", "Data", etc.
          const isHeaderSection = titleText.includes('Header') || 
                                 titleText.includes('HEADER') ||
                                 titleText.includes('Cabeçalho') ||
                                 titleText.includes('CABEÇALHO') ||
                                 // Check for common header field patterns
                                 /^(RAG Index|Titulo|Data|Sistema|Módulo|Caminho)$/i.test(titleText) ||
                                 // Check if title contains header-like content
                                 titleText.includes('Campo') || titleText.includes('Metadados');
          
          // Use # for header sections, ## for other sections
          const headerLevel = isHeaderSection ? '#' : '##';
          markdown += `${headerLevel} ${titleText}\n\n`;
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