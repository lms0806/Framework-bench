package com.frameworkbench;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BenchmarkApplicationTest {
    @LocalServerPort
    int port;

    @Test
    void endpointsReturnExpectedResponses() {
        RestClient client = RestClient.create("http://localhost:" + port);
        assertResponse(client, "/health", "text/plain;charset=UTF-8", "OK");
        assertResponse(client, "/plaintext", "text/plain;charset=UTF-8", "Hello, World!");
        assertResponse(client, "/json", "application/json", "{\"message\":\"Hello, World!\"}");
    }

    private void assertResponse(RestClient client, String path, String contentType, String body) {
        ResponseEntity<String> response = client.get().uri(path).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatusCode.valueOf(200));
        assertThat(response.getHeaders().getFirst("Content-Type")).isEqualToIgnoringCase(contentType);
        assertThat(response.getBody()).isEqualTo(body);
    }
}
