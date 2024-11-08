import { marshall } from "@aws-sdk/util-dynamodb";
import { Book } from "./types";

// Generate an item for the batch write operation
export const generateItem = (entity: Book) => { 
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

// Generate a batch for the batch write operation
export const generateBatch = (data: Book[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};
