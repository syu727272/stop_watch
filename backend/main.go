package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

type Stopwatch struct {
	StartTime   *time.Time `json:"-"`
	ElapsedTime int64      `json:"elapsedTime"`
	IsRunning   bool       `json:"isRunning"`
	mu          sync.Mutex
}

func (s *Stopwatch) GetCurrentElapsed() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.IsRunning && s.StartTime != nil {
		return s.ElapsedTime + time.Since(*s.StartTime).Milliseconds()
	}
	return s.ElapsedTime
}

func (s *Stopwatch) Start() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.IsRunning {
		now := time.Now()
		s.StartTime = &now
		s.IsRunning = true
	}
}

func (s *Stopwatch) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.IsRunning && s.StartTime != nil {
		s.ElapsedTime += time.Since(*s.StartTime).Milliseconds()
		s.IsRunning = false
		s.StartTime = nil
	}
}

func (s *Stopwatch) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.StartTime = nil
	s.ElapsedTime = 0
	s.IsRunning = false
}

type Lap struct {
	ID        int       `json:"id"`
	LapTime   int64     `json:"lap_time"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	db       *sql.DB
	sw       = &Stopwatch{}
)

func initDB() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://user:password@db:5432/stopwatch?sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	// Wait for DB to be ready
	for i := 0; i < 10; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("Waiting for database... %v", err)
		time.Sleep(2 * time.Second)
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS laps (
			id SERIAL PRIMARY KEY,
			lap_time BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Database initialized.")
}

func main() {
	initDB()

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/api/time", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"elapsedTime": sw.GetCurrentElapsed()})
	})

	r.POST("/api/start", func(c *gin.Context) {
		sw.Start()
		c.JSON(http.StatusOK, gin.H{"message": "Stopwatch started."})
	})

	r.POST("/api/stop", func(c *gin.Context) {
		sw.Stop()
		c.JSON(http.StatusOK, gin.H{"message": "Stopwatch stopped."})
	})

	r.POST("/api/reset", func(c *gin.Context) {
		sw.Reset()
		_, err := db.Exec("DELETE FROM laps")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Stopwatch reset and laps cleared."})
	})

	r.GET("/api/laps", func(c *gin.Context) {
		rows, err := db.Query("SELECT id, lap_time, created_at FROM laps ORDER BY id DESC")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		laps := []Lap{}
		for rows.Next() {
			var l Lap
			if err := rows.Scan(&l.ID, &l.LapTime, &l.CreatedAt); err != nil {
				log.Println(err)
				continue
			}
			laps = append(laps, l)
		}
		c.JSON(http.StatusOK, laps)
	})

	r.POST("/api/laps", func(c *gin.Context) {
		elapsed := sw.GetCurrentElapsed()
		if elapsed > 0 {
			var lap Lap
			err := db.QueryRow("INSERT INTO laps (lap_time) VALUES ($1) RETURNING id, lap_time, created_at", elapsed).
				Scan(&lap.ID, &lap.LapTime, &lap.CreatedAt)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, lap)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Stopwatch is not running or has not started."})
		}
	})

	r.DELETE("/api/laps/:id", func(c *gin.Context) {
		id := c.Param("id")
		var lap Lap
		err := db.QueryRow("DELETE FROM laps WHERE id = $1 RETURNING id, lap_time, created_at", id).
			Scan(&lap.ID, &lap.LapTime, &lap.CreatedAt)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Lap not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Lap deleted.", "lap": lap})
	})

	r.Run(":3001")
}
