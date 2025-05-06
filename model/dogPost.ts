// To parse this data:
//
//   import { Convert, DogPost } from "./file";
//
//   const dogPost = Convert.toDogPost(json);

export interface DogPost {
    user_email:        string;
    name:              string;
    breed:             string;
    gender:            string;
    color:             string;
    defect:            string;
    birthday:          string;
    congentialDisease: string;
    sterilization:     string;
    hair:              string;
    image:             string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toDogPost(json: string): DogPost {
        return JSON.parse(json);
    }

    public static dogPostToJson(value: DogPost): string {
        return JSON.stringify(value);
    }
}
