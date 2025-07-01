// To parse this data:
//
//   import { Convert, AppointmentPost } from "./file";
//
//   const appointmentPost = Convert.toAppointmentPost(json);

export interface AppointmentPost {
    aid:                number;
    dogId:              number;
    general_user_email: string;
    vaccine:            string;
    month:              number;
    date:               string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toAppointmentPost(json: string): AppointmentPost {
        return JSON.parse(json);
    }

    public static appointmentPostToJson(value: AppointmentPost): string {
        return JSON.stringify(value);
    }
}
