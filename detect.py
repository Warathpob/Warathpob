import face_recognition
import cv2
import requests
import os

# Function to notify the web server
def notify_web_server(message):
    url = 'https://notify-api.line.me/api/notify'
    data = {'message': message}
    response = requests.post(url, data=data)
    return response.status_code

# Load and encode known faces from the folder
def load_known_faces(folder_path):
    known_face_encodings = {}
    for filename in os.listdir(folder_path):
        if filename.endswith(('.jpg', '.png')):
            name = os.path.splitext(filename)[0]
            image_path = os.path.join(folder_path, filename)
            image = face_recognition.load_image_file(image_path)
            face_encoding = face_recognition.face_encodings(image)
            if face_encoding:
                known_face_encodings[name] = face_encoding[0]
    return known_face_encodings

# Function for face detection and recognition
def recognize_face():
    known_face_encodings = load_known_faces('known_faces')
    known_face_names = list(known_face_encodings.keys())

    # Initialize the camera
    cap = cv2.VideoCapture(0)

    found_person = False

    while True:
        # Read a frame from the camera
        ret, frame = cap.read()

        # Convert the frame to RGB (face_recognition uses RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Find all face locations and encodings in the current frame
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(list(known_face_encodings.values()), face_encoding)
            name = "Unknown"

            # Check if the detected face matches any known faces
            if True in matches:
                first_match_index = matches.index(True)
                name = known_face_names[first_match_index]
                if not found_person:
                    # Notify the web server if a known person is found
                    message = f'{name} detected!'
                    notify_web_server(message)
                    found_person = True

            # Draw a rectangle around the face and label it
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.5, (255, 255, 255), 1)

        # Display the resulting image
        cv2.imshow('Face Recognition', frame)

        # Exit on 'q' key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release the camera and close windows
    cap.release()
    cv2.destroyAllWindows()

# Run the face recognition program
recognize_face()
