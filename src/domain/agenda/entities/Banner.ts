export type AgendaBannerData =
  | {
      mode: "doctor";
      name: string;
      specialty: string;
      location: string;
      email: string;
      phone: string;
      totalPatients: number;
      inTreatment: number;
      todayAppointments: number;
      completedToday: number;
    }
  | {
      mode: "clinic";
      name: string;
      location: string;
      totalPatients: number;
      inTreatment: number;
      todayAppointments: number;
      completedToday: number;
      activeDoctors: number;
    };
