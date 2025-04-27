// To parse this data:
//
//   import { Convert, DoctorPost } from "./file";
//
//   const doctorPost = Convert.toDoctorPost(json);

export interface DoctorPost {
    name:     string;
    surname:  string;
    careerNo: string;
    image:    string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toDoctorPost(json: string): DoctorPost {
        return JSON.parse(json);
    }

    public static doctorPostToJson(value: DoctorPost): string {
        return JSON.stringify(value);
    }
}
