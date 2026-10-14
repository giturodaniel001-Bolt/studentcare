# StudentCare

A privacy-centred student counselling access and follow-up system for Kenyan universities.

## The Problem

Students hesitate to use campus counselling services because they fear their personal stories may be shared, they may be judged, or they don't understand the limits of confidentiality. This project investigates those concerns and proposes a system that makes existing counselling services more accessible and trustworthy.

## Features

- **Discreet appointment requests** — students submit privately and choose how to be contacted
- **Transparent confidentiality guide** — students understand what is collected and why
- **Anonymous tracking codes** — students check status with a code like `SC-4F8A2B`, never exposing their email
- **Counsellor dashboard** — authorised staff manage appointment status
- **Audit log** — every access and update is recorded for accountability

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Python 3 + Flask |
| Database | MySQL 8 |
| Auth | Session-based, password hashing (Werkzeug) |

## Project Structure
