-- --------------------------------------------------------
-- Διακομιστής:                  127.0.0.1
-- Έκδοση διακομιστή:            12.1.2-MariaDB - MariaDB Server
-- Λειτ. σύστημα διακομιστή:     Win64
-- HeidiSQL Έκδοση:              12.13.0.7147
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for tavli
CREATE DATABASE IF NOT EXISTS `tavli` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `tavli`;

-- Dumping structure for πίνακας tavli.board
CREATE TABLE IF NOT EXISTS `board` (
  `row` int(11) NOT NULL,
  `col` int(11) NOT NULL,
  PRIMARY KEY (`row`,`col`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table tavli.board: ~24 rows (approximately)
INSERT INTO `board` (`row`, `col`) VALUES
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(1, 6),
	(1, 7),
	(1, 8),
	(1, 9),
	(1, 10),
	(1, 11),
	(1, 12),
	(2, 1),
	(2, 2),
	(2, 3),
	(2, 4),
	(2, 5),
	(2, 6),
	(2, 7),
	(2, 8),
	(2, 9),
	(2, 10),
	(2, 11),
	(2, 12);

-- Dumping structure for procedure tavli.change_turn
DELIMITER //
CREATE PROCEDURE `change_turn`()
BEGIN
    DECLARE cur_turn CHAR(1);

    START TRANSACTION;

    SELECT p_turn INTO cur_turn
    FROM game_status
    LIMIT 1
    FOR UPDATE;

    UPDATE game_status
    SET
        p_turn = IF(cur_turn='W','B','W'),
        move_1 = NULL,
        move_2 = NULL,
        move_3 = NULL,
        move_4 = NULL;

    COMMIT;
END//
DELIMITER ;

-- Dumping structure for πίνακας tavli.game_status
CREATE TABLE IF NOT EXISTS `game_status` (
  `status` enum('not active','initialized','started','ended','aborded') NOT NULL DEFAULT 'not active',
  `p_turn` enum('W','B') DEFAULT NULL,
  `last_change` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `move_1` int(11) DEFAULT NULL,
  `move_2` int(11) DEFAULT NULL,
  `move_3` int(11) DEFAULT NULL,
  `move_4` int(11) DEFAULT NULL,
  `score_w` tinyint(4) DEFAULT 0,
  `score_b` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table tavli.game_status: ~1 rows (approximately)
INSERT INTO `game_status` (`status`, `p_turn`, `last_change`, `move_1`, `move_2`, `move_3`, `move_4`, `score_w`, `score_b`) VALUES
	('not active', NULL, '2025-12-31 17:40:23', NULL, NULL, NULL, NULL, 0, 0);

-- Dumping structure for procedure tavli.move_piece
DELIMITER //
CREATE PROCEDURE `move_piece`(
	IN `r1` TINYINT,
	IN `c1` TINYINT,
	IN `r2` TINYINT,
	IN `c2` tinyint
)
BEGIN
    DECLARE old_index INT;
    DECLARE new_index INT;
    DECLARE color CHAR(1);
    DECLARE dst_color CHAR(1);
    DECLARE dst_count INT;
    
    DECLARE pos_from INT;
    DECLARE pos_to INT;
    DECLARE move_diff INT; 
    DECLARE move_dist INT;
    DECLARE used_die_slot INT DEFAULT 0; 
    DECLARE pieces_behind INT DEFAULT 0;
    
    DECLARE p_turn_now CHAR(1);
    DECLARE m1 INT; DECLARE m2 INT; DECLARE m3 INT; DECLARE m4 INT;

    START TRANSACTION;

    SELECT p_turn, move_1, move_2, move_3, move_4
    INTO p_turn_now, m1, m2, m3, m4
    FROM game_status LIMIT 1 FOR UPDATE;

    SELECT piece_index, piece_color INTO old_index, color
    FROM stack WHERE row=r1 AND col=c1 ORDER BY piece_index DESC LIMIT 1 FOR UPDATE;

    IF old_index IS NULL THEN ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='No piece at source'; END IF;
    IF color != p_turn_now THEN ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Not your turn'; END IF;

    -- === ΜΑΖΕΜΑ (BEARING OFF) ===
    IF r2 = 0 AND c2 = 0 THEN
        SET move_dist = 13 - c1;

        -- Έλεγχος Ακριβούς Ζαριάς
        IF m1 = move_dist THEN SET used_die_slot = 1;
        ELSEIF m2 = move_dist THEN SET used_die_slot = 2;
        ELSEIF m3 = move_dist THEN SET used_die_slot = 3;
        ELSEIF m4 = move_dist THEN SET used_die_slot = 4;
        END IF;

        -- Έλεγχος Μεγαλύτερης Ζαριάς (αν δεν υπάρχει πούλι πίσω)
        IF used_die_slot = 0 THEN
            SELECT COUNT(*) INTO pieces_behind FROM stack 
            WHERE row=r1 AND col >= 7 AND col < c1 AND piece_color=color;

            IF pieces_behind = 0 THEN
                IF m1 > move_dist THEN SET used_die_slot = 1;
                ELSEIF m2 > move_dist THEN SET used_die_slot = 2;
                ELSEIF m3 > move_dist THEN SET used_die_slot = 3;
                ELSEIF m4 > move_dist THEN SET used_die_slot = 4;
                END IF;
            END IF;
        END IF;

        IF used_die_slot = 0 THEN ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid Die for Bearing Off'; END IF;

        DELETE FROM stack WHERE row=r1 AND col=c1 AND piece_index=old_index;

    -- === ΚΑΝΟΝΙΚΗ ΚΙΝΗΣΗ ===
    ELSE
        SET pos_from = CASE WHEN r1=1 THEN (13 - c1) ELSE (12 + c1) END;
        SET pos_to = CASE WHEN r2=1 THEN (13 - c2) ELSE (12 + c2) END;
        SET move_dist = ABS(pos_to - pos_from); 

        IF m1 = move_dist THEN SET used_die_slot = 1;
        ELSEIF m2 = move_dist THEN SET used_die_slot = 2;
        ELSEIF m3 = move_dist THEN SET used_die_slot = 3;
        ELSEIF m4 = move_dist THEN SET used_die_slot = 4;
        ELSE ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='No matching die'; END IF;

        SELECT piece_color INTO dst_color FROM stack WHERE row=r2 AND col=c2 ORDER BY piece_index DESC LIMIT 1;
        SELECT COUNT(*) INTO dst_count FROM stack WHERE row=r2 AND col=c2;

        IF (dst_count >= 2 AND color != dst_color) THEN ROLLBACK; SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Blocked'; END IF;

        SELECT COALESCE(MAX(piece_index),0)+1 INTO new_index FROM stack WHERE row=r2 AND col=c2;
        UPDATE stack SET row=r2, col=c2, piece_index=new_index WHERE row=r1 AND col=c1 AND piece_index=old_index;
    END IF;

    -- === ΚΑΨΙΜΟ ΖΑΡΙΟΥ & ΑΛΛΑΓΗ ΣΕΙΡΑΣ ===
    IF used_die_slot = 1 THEN UPDATE game_status SET move_1 = NULL;
    ELSEIF used_die_slot = 2 THEN UPDATE game_status SET move_2 = NULL;
    ELSEIF used_die_slot = 3 THEN UPDATE game_status SET move_3 = NULL;
    ELSEIF used_die_slot = 4 THEN UPDATE game_status SET move_4 = NULL;
    END IF;

    UPDATE players SET last_action = NOW() WHERE username IS NOT NULL;

    SELECT move_1, move_2, move_3, move_4 INTO m1, m2, m3, m4 FROM game_status;
    IF m1 IS NULL AND m2 IS NULL AND m3 IS NULL AND m4 IS NULL THEN
        UPDATE game_status SET p_turn = IF(p_turn_now = 'W', 'B', 'W');
    END IF;

    COMMIT;
END//
DELIMITER ;

-- Dumping structure for πίνακας tavli.players
CREATE TABLE IF NOT EXISTS `players` (
  `username` varchar(20) DEFAULT NULL,
  `piece_color` enum('B','W') NOT NULL,
  `token` varchar(100) DEFAULT NULL,
  `last_action` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`piece_color`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table tavli.players: ~2 rows (approximately)
INSERT INTO `players` (`username`, `piece_color`, `token`, `last_action`) VALUES
	(NULL, 'B', NULL, NULL),
	(NULL, 'W', NULL, NULL);

-- Dumping structure for procedure tavli.reset_game
DELIMITER //
CREATE PROCEDURE `reset_game`()
BEGIN
    START TRANSACTION;

    DELETE FROM stack;

    -- Αρχική θέση (ΠΑΡΑΔΕΙΓΜΑ)
    INSERT INTO stack VALUES
    (1,12,1,'B'), (1,12,2,'B'),
    (1,12,3,'B'), (1,12,4,'B'), (1,12,5,'B'), (1,12,6,'B'), (1,12,7,'B'),
    (1,12,8,'B'), (1,12,9,'B'), (1,12,10,'B'),
    (1,12,11,'B'), (1,12,12,'B'), (1,12,13,'B'), (1,12,14,'B'), (1,12,15,'B'),

    (2,12,1,'W'), (2,12,2,'W'),
    (2,12,3,'W'), (2,12,4,'W'), (2,12,5,'W'), (2,12,6,'W'), (2,12,7,'W'),
    (2,12,8,'W'), (2,12,9,'W'), (2,12,10,'W'),
    (2,12,11,'W'), (2,12,12,'W'), (2,12,13,'W'), (2,12,14,'W'), (2,12,15,'W');

    UPDATE players
    SET username= NULL,
    token= NULL,
    last_action= NULL;


    UPDATE game_status
    SET   move_1= NULL,
    move_2= NULL,
    move_3= NULL,
    move_4= NULL;
    
    COMMIT;
END//
DELIMITER ;

-- Dumping structure for procedure tavli.restart_game
DELIMITER //
CREATE PROCEDURE `restart_game`()
BEGIN
    START TRANSACTION;

    DELETE FROM stack;

    -- Αρχική θέση (ΠΑΡΑΔΕΙΓΜΑ)
    INSERT INTO stack VALUES
    (1,12,1,'B'), (1,12,2,'B'),
    (1,12,3,'B'), (1,12,4,'B'), (1,12,5,'B'), (1,12,6,'B'), (1,12,7,'B'),
    (1,12,8,'B'), (1,12,9,'B'), (1,12,10,'B'),
    (1,12,11,'B'), (1,12,12,'B'), (1,12,13,'B'), (1,12,14,'B'), (1,12,15,'B'),

    (2,12,1,'W'), (2,12,2,'W'),
    (2,12,3,'W'), (2,12,4,'W'), (2,12,5,'W'), (2,12,6,'W'), (2,12,7,'W'),
    (2,12,8,'W'), (2,12,9,'W'), (2,12,10,'W'),
    (2,12,11,'W'), (2,12,12,'W'), (2,12,13,'W'), (2,12,14,'W'), (2,12,15,'W');


    UPDATE game_status
    SET   move_1= NULL,
    move_2= NULL,
    move_3= NULL,
    move_4= NULL;
    
    COMMIT;
END//
DELIMITER ;

-- Dumping structure for πίνακας tavli.stack
CREATE TABLE IF NOT EXISTS `stack` (
  `row` int(11) NOT NULL,
  `col` int(11) NOT NULL,
  `piece_index` int(11) NOT NULL,
  `piece_color` char(1) NOT NULL,
  PRIMARY KEY (`row`,`col`,`piece_index`),
  CONSTRAINT `1` FOREIGN KEY (`row`, `col`) REFERENCES `board` (`row`, `col`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table tavli.stack: ~30 rows (approximately)
INSERT INTO `stack` (`row`, `col`, `piece_index`, `piece_color`) VALUES
	(1, 12, 1, 'B'),
	(1, 12, 2, 'B'),
	(1, 12, 3, 'B'),
	(1, 12, 4, 'B'),
	(1, 12, 5, 'B'),
	(1, 12, 6, 'B'),
	(1, 12, 7, 'B'),
	(1, 12, 8, 'B'),
	(1, 12, 9, 'B'),
	(1, 12, 10, 'B'),
	(1, 12, 11, 'B'),
	(1, 12, 12, 'B'),
	(1, 12, 13, 'B'),
	(1, 12, 14, 'B'),
	(1, 12, 15, 'B'),
	(2, 12, 1, 'W'),
	(2, 12, 2, 'W'),
	(2, 12, 3, 'W'),
	(2, 12, 4, 'W'),
	(2, 12, 5, 'W'),
	(2, 12, 6, 'W'),
	(2, 12, 7, 'W'),
	(2, 12, 8, 'W'),
	(2, 12, 9, 'W'),
	(2, 12, 10, 'W'),
	(2, 12, 11, 'W'),
	(2, 12, 12, 'W'),
	(2, 12, 13, 'W'),
	(2, 12, 14, 'W'),
	(2, 12, 15, 'W');


/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;