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

-- Dumping structure for πίνακας tavli.game_status
CREATE TABLE IF NOT EXISTS `game_status` (
  `status` enum('not active','initialized','started','ended','aborded') NOT NULL DEFAULT 'not active',
  `p_turn` enum('W','B') DEFAULT NULL,
  `result` enum('B','W') DEFAULT NULL,
  `last_change` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table tavli.game_status: ~1 rows (approximately)
INSERT INTO `game_status` (`status`, `p_turn`, `result`, `last_change`) VALUES
	('started', 'W', NULL, '2025-12-17 16:08:23');

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
	  DECLARE top_index INT;
    START TRANSACTION;

    SELECT piece_index, piece_color
    INTO old_index, color
    FROM stack
    WHERE row=r1 AND col=c1
    ORDER BY piece_index DESC
    LIMIT 1
    FOR UPDATE;
    
   SELECT piece_color
	INTO  dst_color
	FROM stack
	WHERE row=r2 AND col=c2
	ORDER BY piece_index DESC
	LIMIT 1
	FOR UPDATE;
	
	SELECT COUNT(*)
	INTO dst_count
	FROM stack
	WHERE row=r2 AND col=c2;

    IF old_index IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='No piece at source';

    END IF;

	 IF ((r1 >0) AND (r1 <=2)) AND ((r2 >0) AND (r2 <=2))  THEN
     IF (dst_count >= 2 AND color != dst_color) THEN
     SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'Illegal move plakwma';
    ELSE
      SELECT COALESCE(MAX(piece_index),0)+1
    INTO new_index
    FROM stack
    WHERE row=r2 AND col=c2
    FOR UPDATE;
    
    UPDATE stack
    SET row=r2, col=c2, piece_index=new_index
    WHERE row=r1 AND col=c1 AND piece_index=old_index;
    END IF;
    ELSE 
     SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'Illegal move this stack doesnt exist';
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
	('leo', 'B', 'f9c3634252c60a6960683066b6b928f6', '2025-12-17 16:07:13'),
	('siggi', 'W', 'd1d0fcc04834cd5198e55b91b47126b2', '2025-12-17 16:06:55');

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

-- Dumping structure for πίνακας tavli.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(25) NOT NULL,
  `password` char(255) NOT NULL,
  `reg_date` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table tavli.users: ~7 rows (approximately)
INSERT INTO `users` (`id`, `user`, `password`, `reg_date`) VALUES
	(1, 'dimitris_sigiridis', 'siggi123', '2025-11-23 16:15:29'),
	(2, 'dimitris_siggi', '$2y$10$m8blWVPgVn3a01hguVer2u8b71ttScBIaSfTS/VCQ0iqs5e0TFB5u', '2025-11-23 16:24:54'),
	(19, 'leo', '$2y$10$i6jbdvFmrpeY7r8iZE8n9uyQbPu74zxzwkLecyOol07dSBCJa3oUm', '2025-11-23 17:47:15'),
	(35, 'siggi', '$2y$10$HBtqj18NPtFN4/lPWLNGqefMqlk2kj5jjiSRaitNPTIYgKihnD.pa', '2025-11-23 18:50:41'),
	(36, 'blue label', '$2y$10$X5seHJfgIlZfTlJjTPTlU.LrvmibAqUVwX53UQyYffXNitCJuWw4y', '2025-11-23 19:36:08'),
	(37, 'turbox', '$2y$10$E8U7auFk1uqJp/e6.5HDT.NBJyaiotwn.dG5fIdvEX.gYcesGCWJC', '2025-11-25 18:05:26'),
	(43, 'lioste', '$2y$10$PiZiilS7MqFo5XS6i6Sfx.kJYCq0OJ8agF16/q00qyyKXK4W9J79O', '2025-12-06 03:51:54');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;