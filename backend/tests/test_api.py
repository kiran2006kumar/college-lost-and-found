from datetime import date, timedelta

from fastapi.testclient import TestClient

from tests.conftest import register


def test_health_and_register_login(client: TestClient):
    assert client.get("/api/health").json()["status"] == "ok"
    token, _ = register(client)
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    response = client.post("/api/auth/login", json={"email": "student@college.edu", "password": "correct-horse-battery"})
    assert response.status_code == 200
    assert client.post("/api/auth/login", json={"email": "student@college.edu", "password": "wrong-password"}).status_code == 401


def test_report_requires_auth_and_search_filters(client: TestClient):
    payload = {"item_type": "lost", "title": "Blue backpack", "description": "Canvas backpack with a stitched star patch", "category": "Bags", "color": "Blue", "location": "Hawthorne Library", "event_date": str(date.today())}
    assert client.post("/api/items", json=payload).status_code == 401
    token, _ = register(client)
    response = client.post("/api/items", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    assert "email" not in response.json()
    assert len(client.get("/api/items", params={"q": "star", "category": "Bags"}).json()) == 1
    assert len(client.get("/api/items", params={"q": "backpack", "item_type": "lost"}).json()) == 1


def test_match_claim_review_and_notifications(client: TestClient):
    reporter_token, reporter_id = register(client, "reporter@college.edu")
    claimant_token, _ = register(client, "claimant@college.edu")
    lost = {"item_type": "lost", "title": "Navy canvas backpack", "description": "Navy backpack with astronomy patch on front pocket", "category": "Bags", "color": "Navy", "location": "Hawthorne Library", "event_date": str(date.today() - timedelta(days=1))}
    found = {**lost, "item_type": "found", "title": "Blue backpack with patch", "description": "Found a canvas bag with a space-themed patch near library study rooms", "color": "Blue", "location": "Hawthorne Library study rooms"}
    lost_response = client.post("/api/items", json=lost, headers={"Authorization": f"Bearer {reporter_token}"})
    found_response = client.post("/api/items", json=found, headers={"Authorization": f"Bearer {reporter_token}"})
    assert lost_response.status_code == found_response.status_code == 201
    matches = client.get(f"/api/items/{lost_response.json()['id']}/matches", headers={"Authorization": f"Bearer {reporter_token}"})
    assert matches.status_code == 200 and matches.json()[0]["score"] > 0
    match_id = matches.json()[0]["id"]
    reviewed = client.patch(f"/api/items/{lost_response.json()['id']}/matches/{match_id}", json={"review_status": "confirmed"}, headers={"Authorization": f"Bearer {reporter_token}"})
    assert reviewed.status_code == 200 and reviewed.json()["review_status"] == "confirmed"
    forbidden_review = client.patch(f"/api/items/{lost_response.json()['id']}/matches/{match_id}", json={"review_status": "rejected"}, headers={"Authorization": f"Bearer {claimant_token}"})
    assert forbidden_review.status_code == 403
    edited = client.patch(f"/api/items/{lost_response.json()['id']}", json={"description": "Canvas bag with a different stitched patch description"}, headers={"Authorization": f"Bearer {reporter_token}"})
    assert edited.status_code == 200
    refreshed_matches = client.get(f"/api/items/{lost_response.json()['id']}/matches", headers={"Authorization": f"Bearer {reporter_token}"}).json()
    assert len(refreshed_matches) == 1 and refreshed_matches[0]["id"] == match_id
    claim = client.post(f"/api/claims/items/{found_response.json()['id']}", json={"private_evidence": "There is a small brass key inside the front zipper pocket."}, headers={"Authorization": f"Bearer {claimant_token}"})
    assert claim.status_code == 201 and claim.json()["status"] == "pending"
    approved = client.patch(f"/api/claims/{claim.json()['id']}", json={"status": "approved"}, headers={"Authorization": f"Bearer {reporter_token}"})
    assert approved.status_code == 200 and approved.json()["private_evidence"].startswith("There is")
    completed = client.patch(f"/api/claims/{claim.json()['id']}", json={"status": "completed"}, headers={"Authorization": f"Bearer {reporter_token}"})
    assert completed.status_code == 200 and completed.json()["status"] == "completed"
    returned_item = client.get(f"/api/items/{found_response.json()['id']}")
    assert returned_item.status_code == 200 and returned_item.json()["status"] == "returned"
    assert client.get("/api/notifications", headers={"Authorization": f"Bearer {claimant_token}"}).json()


def test_students_cannot_access_admin_stats(client: TestClient):
    token, _ = register(client)
    assert client.get("/api/admin/stats", headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_public_stats_profile_and_dashboard_use_database_records(client: TestClient):
    token, user_id = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"item_type": "lost", "title": "Green notebook", "description": "Green notebook with a cloth cover", "category": "Books", "location": "Science building", "event_date": str(date.today())}
    report = client.post("/api/items", json=payload, headers=headers)
    assert report.status_code == 201
    stats = client.get("/api/stats/public").json()
    assert stats["active_reports"] == 1 and stats["lost_reports"] == 1 and stats["campus_members"] == 1
    dashboard = client.get("/api/dashboard/me", headers=headers)
    assert dashboard.status_code == 200
    assert [item["id"] for item in dashboard.json()["reports"]] == [report.json()["id"]]
    updated = client.patch("/api/auth/me", json={"name": "Updated Student"}, headers=headers)
    assert updated.status_code == 200 and updated.json()["name"] == "Updated Student"


def test_private_notifications_and_contact_validation(client: TestClient):
    reporter_token, _ = register(client, "owner@college.edu")
    claimant_token, _ = register(client, "claimant2@college.edu")
    payload = {"item_type": "found", "title": "Found silver watch", "description": "Small silver watch found near the south entrance", "category": "Accessories", "location": "South entrance", "event_date": str(date.today())}
    item = client.post("/api/items", json=payload, headers={"Authorization": f"Bearer {reporter_token}"}).json()
    claim = client.post(f"/api/claims/items/{item['id']}", json={"private_evidence": "The watch has a tiny scratch beside the clasp."}, headers={"Authorization": f"Bearer {claimant_token}"})
    assert claim.status_code == 201
    owner_notifications = client.get("/api/notifications", headers={"Authorization": f"Bearer {reporter_token}"}).json()
    assert len(owner_notifications) == 1 and "private_evidence" not in owner_notifications[0]
    notification_id = owner_notifications[0]["id"]
    marked = client.post(f"/api/notifications/{notification_id}/read", headers={"Authorization": f"Bearer {reporter_token}"})
    assert marked.status_code == 200 and marked.json()["is_read"] is True
    claimant_read = client.post(f"/api/notifications/{notification_id}/read", headers={"Authorization": f"Bearer {claimant_token}"})
    assert claimant_read.status_code == 404
    closed = client.patch(f"/api/items/{item['id']}", json={"status": "closed"}, headers={"Authorization": f"Bearer {reporter_token}"})
    assert closed.status_code == 200
    claimant_notifications = client.get("/api/notifications", headers={"Authorization": f"Bearer {claimant_token}"}).json()
    assert any(note["title"] == "A claimed report was closed" for note in claimant_notifications)
    assert all("private_evidence" not in note for note in claimant_notifications)
    contact = client.post("/api/contact", json={"name": "Campus Member", "email": "member@college.edu", "subject": "Question", "message": "Where can I pick up an item?"})
    assert contact.status_code == 202
    assert client.post("/api/contact", json={"name": "A", "email": "bad", "subject": "?", "message": "x"}).status_code == 422


def test_invalid_image_upload_is_rejected(client: TestClient):
    token, _ = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"item_type": "found", "title": "Found wallet", "description": "A brown leather wallet near the dining hall", "category": "Accessories", "location": "Dining hall", "event_date": str(date.today())}
    item = client.post("/api/items", json=payload, headers=headers).json()
    response = client.post(f"/api/items/{item['id']}/image", headers=headers, files={"image": ("not-an-image.jpg", b"not an image", "image/jpeg")})
    assert response.status_code == 415
