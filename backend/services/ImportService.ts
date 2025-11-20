import { v4 as uuidv4 } from "uuid";
import { UploadService } from "./UploadService";
import { ProcessMenuRequest, MenuSection, MenuItem, TransformedData } from "../interfaces/Menu";

export class ImportService {
  private static instance: ImportService;
  private isProcessing: boolean = false;

  private constructor() {}

  public static getInstance(): ImportService {
    if (!ImportService.instance) {
      ImportService.instance = new ImportService();
    }
    return ImportService.instance;
  }

  static async processMenuImages(request: ProcessMenuRequest) {
    const instance = ImportService.getInstance();
    if (instance.isProcessing) {
      throw new Error("Another menu is currently being processed");
    }

    try {
      instance.isProcessing = true;

      if (!request.fileUrls || request.fileUrls.length === 0) {
        throw new Error("No files provided");
      }

      const results = [];
      const sourceImage = request.fileUrls[0];

      for (let i = 0; i < request.fileUrls.length; i++) {
        const url = request.fileUrls[i];
        const fileType = request.fileTypes?.[i];
        
        if (fileType && (
            fileType.startsWith('text/') || 
            fileType === 'application/pdf' || 
            fileType === 'application/msword' || 
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )) {
          // Handle document files
          const text = await UploadService.extractTextFromDocument(url, fileType);
          const result = await instance.analyzeTextWithOpenAI(text);
          results.push(result);
        } else if (fileType && fileType.startsWith('image/')) {
          // Handle image files
          const result = await instance.analyzeImageWithVisionAPI(url);
          results.push(result);
        } else {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
      }

      if (!results || results.length === 0) {
        throw new Error("No results returned from processing");
      }

      // Transform the menu data into the expected format
      const menuData = JSON.parse(results[0]);
      // convert menuData to json string
      const menuDataString = JSON.stringify(menuData);
      const transformedData: TransformedData = {
        sections: {},
        dishes: {}
      };

      // Process each section
      if (menuData.sections && Array.isArray(menuData.sections)) {
        menuData.sections.forEach((section: MenuSection, index: number) => {
          const sectionId = uuidv4();
          const dishIds: string[] = [];

          // Create section title dish
          const titleDishId = uuidv4();
          dishIds.push(titleDishId);
          transformedData.dishes[sectionId] = [{
            id: titleDishId,
            title: section.name,
            description: section.description || null,
            price: null,
            section: Number(sectionId),
            type: "sectionTitle",
            order_position: 0,
            column: 1,
            dietaryIcons: [],
            addOns: null
          }];

          // Create menu items
          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: MenuItem, itemIndex: number) => {
              const dishId = uuidv4();
              dishIds.push(dishId);
              transformedData.dishes[sectionId].push({
                id: dishId,
                title: item.name,
                description: item.description,
                price: item.price,
                section: Number(sectionId),
                type: "dish",
                order_position: itemIndex + 1,
                column: 1,
                dietaryIcons: item.dietaryInfo,
                addOns: item.addOns.length > 0 ? JSON.stringify(item.addOns) : null
              });
            });
          }

          // Add section to transformed data
          transformedData.sections["1"] = [{
            id: sectionId,
            name: section.name,
            columns: 1,
            dishes: dishIds,
            layout: {
              minW: 1,
              maxW: 1,
              minH: 1,
              maxH: 1,
              w: 1,
              h: 1,
              x: 0,
              y: index,
              i: sectionId
            }
          }];
        });
      }

      return { results, sourceImage, transformedData };
    } catch (error) {
      throw error;
    } finally {
      instance.isProcessing = false;
    }
  }

  private async analyzeTextWithOpenAI(text: string): Promise<string> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Extract all menu data from this text. Return ONLY a JSON object, never markdown or extra text. Transcribe ALL visible content exactly as shown — do NOT correct errors or reword anything. Capture all sections and dishes, even if the layout is complex or multi-column. Read the menu top to bottom, left to right, as a human would. Include every item, including grouped dishes, add-ons, and dietary labels. Important: Do NOT include the price inside the description field. Extract it separately into the "price" field, exactly as it appears on the menu. If any text appears unclear, make your best guess and note a suggestion. Use this structure: { "sections": [ { "name": "Section name", "description": "Optional section description", "items": [ { "name": "Dish name", "description": "Full description without price", "price": "Original format", "dietaryInfo": ["V", "GF", etc], "addOns": [ { "name": "Add-on name", "price": "Add-on price" } ] } ] } ], "suggestions": [ { "original": "Text as shown", "suggested": "Improved version" } ] }\n\nText to analyze:\n${text}`
            }
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Remove markdown formatting if present
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?|\n?```/g, '');
      }

      try {
        JSON.parse(content);
        return content;
      } catch (error: any) {
        throw new Error(`Invalid JSON response from OpenAI API: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private compressPrompt(prompt: string): string {
    // Split into lines to preserve comment structure
    const lines = prompt.split('\n');
    
    // Process each line
    const processedLines = lines.map(line => {
      // If line is empty or only whitespace, remove it
      if (!line.trim()) return '';
      
      // If line starts with ## or *, it's a header or bullet point - keep it
      if (line.trim().startsWith('##') || line.trim().startsWith('*')) {
        return line.trim();
      }
      
      // For other lines, remove extra spaces between words but keep single spaces
      return line.replace(/\s+/g, ' ').trim();
    });
    
    // Join lines back together with single newlines
    return processedLines.filter(line => line !== '').join('\n');
  }

  private async analyzeImageWithVisionAPI(imageUrl: string): Promise<string> {
    try {
      // Original prompt with comments and formatting for development
      const originalPrompt = `Extract all menu data from this image. Return ONLY a JSON object, never markdown or extra text. Transcribe ALL visible content exactly as shown — do NOT correct errors or reword anything. Capture all sections and dishes, even if the layout is complex or multi-column. Read the menu top to bottom, left to right, as a human would. Include every item, including grouped dishes, add-ons, and dietary labels.

                        Important: Do NOT include the price inside the description field. Extract it separately into the "price" field, exactly as it appears on the menu.

                        ## Column Detection Instructions:
                        To determine the number of columns in the menu layout:
                        1. Focus on the MAIN CONTENT AREAS, not headers or footers
                        2. Look for distinct vertical divisions in the menu where content flows independently
                        3. Count how many independent vertical sections of items appear side-by-side
                        4. If columns are uneven in length, still count them as separate columns
                        5. Ignore small alignment variations - focus on the overall structure
                        6. If the menu has different column layouts in different sections, use the MAXIMUM number of columns seen in any section
                        7. The number must be between 1 and 8

                        ## Orientation Detection Instructions:
                        Use the image's visible shape to determine its orientation:
                        * If the image is wider than it is tall, the orientation is "landscape"
                        * If the image is taller than it is wide, the orientation is "portrait"
                        * Return the orientation as a field inside the layout block

                        ## Section Positioning Instructions:
                        For each section, determine its position in the menu:

                        1. Horizontal position (x):
                          - Identify which column (from left to right) each section begins in
                          - Assign a zero-indexed "x" value (0 = leftmost column, 1 = second column, etc.)
                          - For sections spanning multiple columns, still assign "x" as the leftmost column it starts in

                        2. Vertical position (y):
                          - Track which row each section appears in
                          - Assign "y" values in increments of 5:
                            * First row = y value of 0
                            * Second row = y value of 5
                            * Third row = y value of 10
                            * Fourth row = y value of 15
                            * And so on...
                          - Each new row increments by 5 from the previous row's y value
                          - Determine rows based on natural visual groupings from top to bottom
                          - Sections at approximately the same vertical level should have the same y value
                          - If sections in different columns start at different heights but are roughly aligned, give them the same y value

                        3. Width (w):
                          - Determine how many columns each section spans (usually 1) and assign this as "w" value
                          - For headers that span the full width, use x=0 and w=total columns

                        If any text appears unclear, make your best guess and note a suggestion.

                        Use this structure:
                        {
                          "sections": [
                            {
                              "name": "Section name",
                              "description": "Optional section description",
                              "layout": {
                                "x": 0,  // Zero-indexed column position (0 = leftmost column)
                                "y": 0,  // Row position in increments of 5 (0 = first row, 5 = second row, 10 = third row, etc.)
                                "w": 1   // Width - how many columns this section spans (between 1 and 3)
                              },
                              "items": [
                                {
                                  "name": "Dish name",
                                  "description": "Full description without price",
                                  "price": "Original format",
                                  "dietaryInfo": ["V", "GF", etc],
                                  "addOns": [
                                    {
                                      "name": "Add-on name",
                                      "price": "Add-on price"
                                    }
                                  ]
                                }
                              ]
                            }
                          ],
                          "layout": {
                            "columns": number,
                            "orientation": "landscape" or "portrait",
                            "columnNotes": "Brief explanation of how columns were determined"
                          },
                          "suggestions": [
                            {
                              "original": "Text as shown",
                              "suggested": "Improved version"
                            }
                          ]
                        }`;

      // Compress the prompt for API call
      const compressedPrompt = this.compressPrompt(originalPrompt);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: compressedPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 10000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Remove markdown formatting if present
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?|\n?```/g, '');
      }
      
      try {
        // Parse the content to validate it's valid JSON
        const parsedContent = JSON.parse(content);
        return JSON.stringify(parsedContent);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        console.error('Content that failed to parse:', content);
        throw new Error('Invalid JSON response from OpenAI API');
      }
    } catch (error) {
      throw error;
    }
  }
}
