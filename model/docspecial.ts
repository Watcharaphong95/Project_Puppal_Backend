// To parse this data:
//
//   import { Convert } from "./file";
//
//   const docSpecialPost = Convert.toDocSpecialPost(json);

export interface DocSpecialPost {
    doctorID:  string;
    specialID: number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toDocSpecialPost(json: string): DocSpecialPost[] {
        return JSON.parse(json);
    }

    public static docSpecialPostToJson(value: DocSpecialPost[]): string {
        return JSON.stringify(value);
    }
}
