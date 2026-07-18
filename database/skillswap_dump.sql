-- SkillSwap database dump
-- Generated: 2026-07-17T17:01:49.754157+00:00
-- Source: backend/skillswap.db (SQLite)
-- Restore: sqlite3 skillswap.db < skillswap_dump.sql

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

BEGIN TRANSACTION;
CREATE TABLE badges (
	id INTEGER NOT NULL, 
	name VARCHAR(80), 
	description VARCHAR(255), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);
INSERT INTO "badges" VALUES(1,'First Swap','Completed your first skill swap');
INSERT INTO "badges" VALUES(2,'5-Star Teacher','Received five 5-star reviews');
INSERT INTO "badges" VALUES(3,'10 Sessions Streak','Completed 10 sessions in a row');
CREATE TABLE conversation_participants (
	conversation_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	PRIMARY KEY (conversation_id, user_id), 
	FOREIGN KEY(conversation_id) REFERENCES conversations (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
INSERT INTO "conversation_participants" VALUES(1,1);
INSERT INTO "conversation_participants" VALUES(1,2);
INSERT INTO "conversation_participants" VALUES(2,5);
INSERT INTO "conversation_participants" VALUES(2,3);
INSERT INTO "conversation_participants" VALUES(3,5);
INSERT INTO "conversation_participants" VALUES(3,3);
INSERT INTO "conversation_participants" VALUES(4,5);
INSERT INTO "conversation_participants" VALUES(4,3);
INSERT INTO "conversation_participants" VALUES(5,5);
INSERT INTO "conversation_participants" VALUES(5,3);
INSERT INTO "conversation_participants" VALUES(6,5);
INSERT INTO "conversation_participants" VALUES(6,3);
INSERT INTO "conversation_participants" VALUES(7,5);
INSERT INTO "conversation_participants" VALUES(7,2);
INSERT INTO "conversation_participants" VALUES(8,7);
INSERT INTO "conversation_participants" VALUES(8,2);
INSERT INTO "conversation_participants" VALUES(9,7);
INSERT INTO "conversation_participants" VALUES(9,8);
CREATE TABLE conversations (
	id INTEGER NOT NULL, 
	last_message_at DATETIME, 
	PRIMARY KEY (id)
);
INSERT INTO "conversations" VALUES(1,'2026-07-01 04:19:38.214658');
INSERT INTO "conversations" VALUES(2,'2026-07-04 05:23:34.249341');
INSERT INTO "conversations" VALUES(3,'2026-07-17 04:21:00.944582');
INSERT INTO "conversations" VALUES(4,'2026-07-04 05:23:37.208614');
INSERT INTO "conversations" VALUES(5,'2026-07-04 05:23:37.446467');
INSERT INTO "conversations" VALUES(6,'2026-07-04 05:23:37.690089');
INSERT INTO "conversations" VALUES(7,'2026-07-04 10:13:24.395984');
INSERT INTO "conversations" VALUES(8,'2026-07-16 17:18:51.708131');
INSERT INTO "conversations" VALUES(9,'2026-07-16 16:59:13.106132');
CREATE TABLE matches (
	id INTEGER NOT NULL, 
	user_a_id INTEGER NOT NULL, 
	user_b_id INTEGER NOT NULL, 
	match_score FLOAT, 
	status VARCHAR(30), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_a_id) REFERENCES users (id), 
	FOREIGN KEY(user_b_id) REFERENCES users (id)
);
INSERT INTO "matches" VALUES(1,1,2,92.0,'accepted','2026-07-01 04:19:38.212660');
INSERT INTO "matches" VALUES(2,1,3,78.0,'pending','2026-07-01 04:19:38.212660');
INSERT INTO "matches" VALUES(3,5,3,70.0,'accepted','2026-07-04 05:23:34.238691');
INSERT INTO "matches" VALUES(4,5,2,81.0,'accepted','2026-07-04 10:13:24.385586');
INSERT INTO "matches" VALUES(5,7,2,81.0,'accepted','2026-07-14 08:36:40.299740');
INSERT INTO "matches" VALUES(6,7,8,99.0,'accepted','2026-07-16 16:57:52.749490');
CREATE TABLE messages (
	id INTEGER NOT NULL, 
	conversation_id INTEGER NOT NULL, 
	sender_id INTEGER NOT NULL, 
	content TEXT NOT NULL, 
	msg_type VARCHAR(20), 
	read_at DATETIME, 
	created_at DATETIME, attachment_url VARCHAR(512), attachment_name VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(conversation_id) REFERENCES conversations (id), 
	FOREIGN KEY(sender_id) REFERENCES users (id)
);
INSERT INTO "messages" VALUES(1,1,2,'Hey! Ready for our session?','text',NULL,'2026-07-01 04:19:38.244656',NULL,NULL);
INSERT INTO "messages" VALUES(2,9,8,'hi','text','2026-07-16 16:59:09.844444','2026-07-16 16:58:46.333009',NULL,NULL);
INSERT INTO "messages" VALUES(3,9,7,'hi','text',NULL,'2026-07-16 16:59:13.110201',NULL,NULL);
INSERT INTO "messages" VALUES(4,8,7,'AccountFullStatement_1.pdf','file',NULL,'2026-07-16 17:18:51.715137','/uploads/9d74b80a931d4fb0b651548cad88282b.pdf','AccountFullStatement_1.pdf');
INSERT INTO "messages" VALUES(5,3,5,'hi','text',NULL,'2026-07-17 04:21:00.962611',NULL,NULL);
CREATE TABLE newsletter_subscribers (
	id INTEGER NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	subscribed_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE notifications (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	type VARCHAR(50), 
	payload TEXT, 
	read BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE points_transactions (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	amount INTEGER NOT NULL, 
	reason VARCHAR(120), 
	session_id INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(session_id) REFERENCES sessions (id)
);
INSERT INTO "points_transactions" VALUES(1,1,200,'signup_bonus',NULL,'2026-07-01 04:19:38.278046');
INSERT INTO "points_transactions" VALUES(2,9,200,'signup_bonus',NULL,'2026-07-16 17:38:07.122213');
INSERT INTO "points_transactions" VALUES(3,9,10,'daily_login_bonus',NULL,'2026-07-16 17:38:07.122213');
INSERT INTO "points_transactions" VALUES(4,5,100,'daily_login_bonus',NULL,'2026-07-17 03:58:15.048565');
CREATE TABLE reviews (
	id INTEGER NOT NULL, 
	session_id INTEGER, 
	reviewer_id INTEGER, 
	reviewee_id INTEGER, 
	rating INTEGER, 
	comment TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES sessions (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id), 
	FOREIGN KEY(reviewee_id) REFERENCES users (id)
);
CREATE TABLE sessions (
	id INTEGER NOT NULL, 
	teacher_id INTEGER NOT NULL, 
	learner_id INTEGER NOT NULL, 
	skill_id INTEGER, 
	scheduled_at DATETIME NOT NULL, 
	status VARCHAR(30), 
	points_cost INTEGER, 
	meeting_link VARCHAR(512), 
	created_at DATETIME, learning_path TEXT, learning_path_mode VARCHAR(20), learning_path_generated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(teacher_id) REFERENCES users (id), 
	FOREIGN KEY(learner_id) REFERENCES users (id), 
	FOREIGN KEY(skill_id) REFERENCES skills (id)
);
INSERT INTO "sessions" VALUES(1,2,1,4,'2026-07-02 04:19:38.229837','scheduled',10,'','2026-07-01 04:19:38.250768',NULL,NULL,NULL);
CREATE TABLE skills (
	id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	category VARCHAR(80), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);
INSERT INTO "skills" VALUES(1,'Python','Coding');
INSERT INTO "skills" VALUES(2,'React','Coding');
INSERT INTO "skills" VALUES(3,'UI Design','Design');
INSERT INTO "skills" VALUES(4,'Video Editing','Design');
INSERT INTO "skills" VALUES(5,'Spanish','Languages');
INSERT INTO "skills" VALUES(6,'Guitar','Music');
INSERT INTO "skills" VALUES(7,'Fitness Coaching','Fitness');
INSERT INTO "skills" VALUES(8,'Public Speaking','Business');
INSERT INTO "skills" VALUES(9,'Photography','Design');
INSERT INTO "skills" VALUES(10,'JavaScript','Coding');
INSERT INTO "skills" VALUES(11,'digital marketing','General');
INSERT INTO "skills" VALUES(12,'web designing','General');
CREATE TABLE user_badges (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	badge_id INTEGER, 
	earned_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(badge_id) REFERENCES badges (id)
);
INSERT INTO "user_badges" VALUES(1,1,1,'2026-07-01 04:19:38.281079');
CREATE TABLE user_skill_learn (
	user_id INTEGER NOT NULL, 
	skill_id INTEGER NOT NULL, 
	PRIMARY KEY (user_id, skill_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(skill_id) REFERENCES skills (id)
);
INSERT INTO "user_skill_learn" VALUES(1,3);
INSERT INTO "user_skill_learn" VALUES(2,1);
INSERT INTO "user_skill_learn" VALUES(1,4);
INSERT INTO "user_skill_learn" VALUES(3,2);
INSERT INTO "user_skill_learn" VALUES(5,3);
INSERT INTO "user_skill_learn" VALUES(5,4);
INSERT INTO "user_skill_learn" VALUES(6,4);
INSERT INTO "user_skill_learn" VALUES(6,3);
INSERT INTO "user_skill_learn" VALUES(8,12);
INSERT INTO "user_skill_learn" VALUES(7,11);
INSERT INTO "user_skill_learn" VALUES(9,12);
CREATE TABLE user_skill_teach (
	user_id INTEGER NOT NULL, 
	skill_id INTEGER NOT NULL, 
	PRIMARY KEY (user_id, skill_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(skill_id) REFERENCES skills (id)
);
INSERT INTO "user_skill_teach" VALUES(1,1);
INSERT INTO "user_skill_teach" VALUES(2,4);
INSERT INTO "user_skill_teach" VALUES(3,9);
INSERT INTO "user_skill_teach" VALUES(1,2);
INSERT INTO "user_skill_teach" VALUES(5,2);
INSERT INTO "user_skill_teach" VALUES(5,1);
INSERT INTO "user_skill_teach" VALUES(6,1);
INSERT INTO "user_skill_teach" VALUES(6,2);
INSERT INTO "user_skill_teach" VALUES(8,11);
INSERT INTO "user_skill_teach" VALUES(7,12);
INSERT INTO "user_skill_teach" VALUES(9,11);
CREATE TABLE users (
	id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	firebase_uid VARCHAR(128), 
	bio TEXT, 
	avatar_url VARCHAR(512), 
	points_balance INTEGER, 
	xp INTEGER, 
	level INTEGER, 
	streak INTEGER, 
	role VARCHAR(20), 
	onboarding_complete BOOLEAN, 
	availability VARCHAR(120), 
	is_online BOOLEAN, 
	created_at DATETIME, password_hash VARCHAR(255), has_seen_welcome_popup BOOLEAN DEFAULT 1, last_daily_bonus_date DATE, last_daily_bonus_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (email), 
	UNIQUE (firebase_uid)
);
INSERT INTO "users" VALUES(1,'Muhammad','demo@skillswap.io',NULL,'Love teaching web dev and learning design.','',200,450,3,5,'user',1,'flexible',0,'2026-07-01 04:19:38.167843',NULL,1,NULL,NULL);
INSERT INTO "users" VALUES(2,'Roman','roman@skillswap.io',NULL,'Video editor & motion designer','',180,0,1,0,'user',1,'flexible',0,'2026-07-01 04:19:38.171824',NULL,1,NULL,NULL);
INSERT INTO "users" VALUES(3,'Arunima','arunima@skillswap.io',NULL,'Photographer learning React','',150,0,1,0,'user',1,'flexible',0,'2026-07-01 04:19:38.171824',NULL,1,NULL,NULL);
INSERT INTO "users" VALUES(4,'Admin','admin@skillswap.io',NULL,'','',999,0,1,0,'admin',1,'flexible',0,'2026-07-01 04:19:38.175285',NULL,1,NULL,NULL);
INSERT INTO "users" VALUES(5,'Muhammad Burhan Shariq','mburhanshariq@gmail.com',NULL,'kuch nai','',300,0,1,1,'user',1,'flexible',0,'2026-07-01 04:57:54.651821','scrypt:32768:8:1$Z2jgvHgo9elaFkdg$9b798bf5e51ed0e174c4800283f400e4bbf4c77fb81b01529eec236fa722c04ba1dc5d850b42ec1fd5a01e4c8832c30181795a3c9b6297afe5e0aa832576ed11',1,'2026-07-17','2026-07-17 03:58:15.041037');
INSERT INTO "users" VALUES(6,'muhammad burhan','burhanshariq9090@gmail.com',NULL,'kuch nai','',200,0,1,0,'user',1,'flexible',0,'2026-07-04 09:50:52.787874','scrypt:32768:8:1$6n4PidE2e3UmT6J8$577b397d04defb284919c22e1e985612538b8dfeac30744b86a68406f0f94d3d71b572ab8deaf8a7dfc8085c413ce2593114bd700b4569ceada00f0117faafb9',1,NULL,NULL);
INSERT INTO "users" VALUES(7,'M Burhan','mburhan.shariq@gmail.com',NULL,'kuch','',200,0,1,0,'user',1,'flexible',0,'2026-07-14 08:28:11.078864','scrypt:32768:8:1$sXLv4rKwCgBRNNUT$de664a250b310f9d86c52a7aeef8ee50a8cba40854583aedfb31d07b5919ac3ba815ce27d2f017ce7509d5156d8376a4cd7ab2ad39dca1dd3fd53cbc77b7cd45',1,NULL,NULL);
INSERT INTO "users" VALUES(8,'muhammad hassan','mhassan@gmail.com',NULL,'...','',200,0,1,0,'user',1,'flexible',0,'2026-07-16 16:16:36.958074','scrypt:32768:8:1$jEi2TBCJsuJhnIbN$768bceda3bf19b4d377562c6ac72b45ded9685d7d360f4e42d21345e3342d7af3e3d5d5839c2328780bd608eca7f20e75fc11f333b548a9113370aac0f1f9014',1,NULL,NULL);
INSERT INTO "users" VALUES(9,'Abdul Majeed ','majeed@gmail.com',NULL,'...','',210,0,1,1,'user',1,'flexible',0,'2026-07-16 17:38:07.090118','scrypt:32768:8:1$RQ5YLXbDIDIfBjfo$2817e0fc145a698d7bd6db97e8fc0da13e84f0f5005eba8b85dde80546b4438dcd30c8ad15f86f670f15ed57014d94534b0121aa7f23368f5374402b4337a5d6',1,'2026-07-16',NULL);
CREATE UNIQUE INDEX ix_newsletter_subscribers_email ON newsletter_subscribers (email);
COMMIT;

COMMIT;
