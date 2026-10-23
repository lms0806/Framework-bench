package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type message struct {
	Message string `json:"message"`
}

type item struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type aggregateInput struct {
	Numbers []int64 `json:"numbers" binding:"required"`
}

type aggregateResult struct {
	Count int   `json:"count"`
	Sum   int64 `json:"sum"`
	Min   int64 `json:"min"`
	Max   int64 `json:"max"`
}

func router() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.GET("/health", func(c *gin.Context) { c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte("OK")) })
	r.GET("/plaintext", func(c *gin.Context) { c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte("Hello, World!")) })
	r.GET("/json", func(c *gin.Context) { c.JSON(http.StatusOK, message{Message: "Hello, World!"}) })
	r.GET("/json-large", func(c *gin.Context) {
		items := make([]item, 1000)
		for i := range items {
			id := i + 1
			items[i] = item{ID: id, Name: fmt.Sprintf("item-%d", id), Value: id * 10}
		}
		c.JSON(http.StatusOK, items)
	})
	r.POST("/aggregate", func(c *gin.Context) {
		var input aggregateInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		result := aggregateResult{Count: len(input.Numbers)}
		if len(input.Numbers) > 0 {
			result.Min, result.Max = input.Numbers[0], input.Numbers[0]
		}
		for _, n := range input.Numbers {
			result.Sum += n
			if n < result.Min {
				result.Min = n
			}
			if n > result.Max {
				result.Max = n
			}
		}
		c.JSON(http.StatusOK, result)
	})
	return r
}

func main() {
	address := os.Getenv("BIND_ADDR")
	if address == "" {
		address = "0.0.0.0:3000"
	}
	log.Printf("Listening on %s", address)
	if err := router().Run(address); err != nil {
		log.Fatal(err)
	}
}
