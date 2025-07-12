// To parse this data:
//
//   import { Convert, DogsIDListPost } from "./file";
//
//   const dogsIDListPost = Convert.toDogsIDListPost(json);

export interface dataListPost {
    dogId: number[];
    aid: number[];
    clinicEmail: String[];
}

// Converts JSON strings to/from your types
export class Convert {
    public static toDogsIDListPost(json: string): dataListPost {
        return JSON.parse(json);
    }

    public static dogsIDListPostToJson(value: dataListPost): string {
        return JSON.stringify(value);
    }
}
