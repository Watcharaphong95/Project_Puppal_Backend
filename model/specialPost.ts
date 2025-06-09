// To parse this data:
//
//   import { Convert, SpecialPost } from "./file";
//
//   const specialPost = Convert.toSpecialPost(json);

export interface SpecialPost {
    special_id: number;
    name:       string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toSpecialPost(json: string): SpecialPost {
        return JSON.parse(json);
    }

    public static specialPostToJson(value: SpecialPost): string {
        return JSON.stringify(value);
    }
}
